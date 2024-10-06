import { KVDB } from "@/db/client";
import type { AppEnv } from "@/lib/app";
import { createMiddleware } from "hono/factory";

export const dbMiddleware = createMiddleware<AppEnv>(async (c, next) => {
	c.set("db", new KVDB(c.env.DATA_STORE));
	await next();
});
