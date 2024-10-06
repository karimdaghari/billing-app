import { OpenAPIHono, z, type RouteHook } from "@hono/zod-openapi";
import type { KVDB } from "../db/client";
import type { EmailParams } from "@/services/email";
import type { Context } from "hono";
import { HTTPException } from "hono/http-exception";
import { dbMiddleware } from "@/middleware/db";
import { sendEmailMiddleware } from "@/middleware/send-email";

export type AppEnv = {
	Bindings: {
		/**
		 * A key-value store for storing data.
		 * @notes this store acts as our database
		 */
		DATA_STORE: KVNamespace;
		SENDGRID_API_KEY: string;
		FROM_EMAIL_ADDRESS: string;
	};
	Variables: {
		/**
		 * Our database client
		 */
		db: KVDB;
		sendEmail: (params: Omit<EmailParams, "config">) => Promise<void>;
	};
};

export type AppContext = Context<AppEnv>;
/**
 * Creates a new instance of the hono app.
 * This instance is used to define routes and middleware.
 * It also provides a default error handler for validation (zod) errors.
 *
 * @returns {OpenAPIHono<AppEnv>} The created app instance.
 */
export function createAppInstance() {
	const app = new OpenAPIHono<AppEnv>({
		defaultHook: (result, c) => {
			if (!result.success) {
				return c.json(formatZodErrors(result), 422);
			}
		},
	});

	app.use(dbMiddleware, sendEmailMiddleware);

	app.onError((err, c) => {
		if (err instanceof HTTPException) {
			return c.json(
				{
					code: err.status,
					message: err.message,
				},
				err.status,
			);
		}

		return c.json(
			{
				message: "Internal Server Error",
			},
			500,
		);
	});

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

export const ErrorSchema = z
	.object({
		code: z.number().openapi({
			example: 400,
		}),
		message: z.string().openapi({
			example: "Bad Request",
		}),
	})
	.openapi("Error");

export const ResponseSchema = z
	.object({
		code: z.number().openapi({
			example: 200,
		}),
		message: z.string().openapi({
			example: "OK",
		}),
	})
	.openapi("Response");
