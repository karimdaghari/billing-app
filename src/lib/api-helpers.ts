import { z } from "@hono/zod-openapi";

export const createAPIResponseSchema = <T extends z.ZodTypeAny>(
	dataSchema: T,
) =>
	z.object({
		success: z.boolean(),
		data: dataSchema.nullish(),
	});
