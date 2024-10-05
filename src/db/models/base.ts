import { z } from "@hono/zod-openapi";

export const BaseSchema = z.object({
	id: z.string().uuid().describe("Unique identifier for the entity"),
});
