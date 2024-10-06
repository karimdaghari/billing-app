import { z } from "@hono/zod-openapi";
import { BaseSchema } from "./base";

export const CustomerSchema = BaseSchema.extend({
	name: z.string().describe("Customer's name"),
	email: z.string().email().describe("Customer's email address"),
}).openapi("Customer");

export const CustomerInput = CustomerSchema.omit({
	id: true,
}).openapi("CustomerInput");

export type CustomerInput = z.infer<typeof CustomerInput>;
export type CustomerSchema = z.infer<typeof CustomerSchema>;
