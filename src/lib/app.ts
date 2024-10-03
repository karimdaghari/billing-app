import { OpenAPIHono, type RouteHook } from "@hono/zod-openapi";
import { KVDB } from "../db/client";
import { createMiddleware } from "hono/factory";

type Env = {
	Bindings: {
		/**
		 * A key-value store for storing data.
		 * @notes this store acts as our database
		 */
		DATA_STORE: KVNamespace;
	};
	Variables: {
		/**
		 * Our database client
		 */
		db: KVDB;
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
	const app = new OpenAPIHono<Env>({
		defaultHook: (result, c) => {
			if (!result.success) {
				return c.json(formatZodErrors(result), 422);
			}
		},
	});

	const dbMiddleware = createMiddleware<Env>(async (c, next) => {
		c.set("db", new KVDB(c.env.DATA_STORE));
		await next();
	});
	app.use(dbMiddleware);

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
