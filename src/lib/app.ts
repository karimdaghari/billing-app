import { OpenAPIHono, type RouteHook } from "@hono/zod-openapi";
import { KVDB } from "../db/client";
import { createMiddleware } from "hono/factory";
import { sendEmail, type EmailParams } from "@/services/email";

type Env = {
	Bindings: {
		/**
		 * A key-value store for storing data.
		 * @notes this store acts as our database
		 */
		DATA_STORE: KVNamespace;
		SENDGRID_API_KEY: string;
		SENDER_EMAIL_ADDRESS: string;
	};
	Variables: {
		/**
		 * Our database client
		 */
		db: KVDB;
		sendEmail: (params: Omit<EmailParams, "config">) => Promise<void>;
	};
};
/**
 * Creates a new instance of the hono app.
 * This instance is used to define routes and middleware.
 * It also provides a default error handler for validation (zod) errors.
 *
 * @returns {OpenAPIHono<Env>} The created app instance.
 */
export function createAppInstance() {
	const dbMiddleware = createMiddleware<Env>(async (c, next) => {
		c.set("db", new KVDB(c.env.DATA_STORE));
		await next();
	});

	const sendEmailMiddleware = createMiddleware<Env>(async (c, next) => {
		c.set("sendEmail", (params: Omit<EmailParams, "config">) =>
			sendEmail({
				...params,
				config: {
					API_KEY: c.env.SENDER_EMAIL_ADDRESS,
					FROM_EMAIL_ADDRESS: c.env.SENDER_EMAIL_ADDRESS,
				},
			}),
		);
		await next();
	});

	const app = new OpenAPIHono<Env>({
		defaultHook: (result, c) => {
			if (!result.success) {
				return c.json(formatZodErrors(result), 422);
			}
		},
	});

	app.use(dbMiddleware, sendEmailMiddleware);

	return app;
}

type HookResult = Parameters<RouteHook<never>>[0];

function formatZodErrors(result: HookResult) {
	if (!result.success) {
		return {
			message: "Validation failed",
			errors: result.error.errors.map((e) => ({
				path: e.path.join("."),
				message: e.message,
			})),
		};
	}
}
