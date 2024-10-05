import { z } from "@hono/zod-openapi";
import { BaseSchema } from "./base";

export const CustomerSchema = BaseSchema.extend({
	name: z.string().describe("Customer's name"),
	email: z.string().email().describe("Customer's email address"),
	subscription_plan_id: z
		.string()
		.uuid()
		.describe("The current subscription plan the customer is on"),
	subscription_status: z
		.enum(["active", "cancelled"])
		.describe("Current status of the subscription"),
}).openapi("Customer");

export const CustomerInput = CustomerSchema.omit({
	id: true,
}).openapi("CustomerInput");

export type CustomerInput = z.infer<typeof CustomerInput>;
export type CustomerSchema = z.infer<typeof CustomerSchema>;
