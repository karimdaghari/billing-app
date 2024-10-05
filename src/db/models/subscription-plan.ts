import { z } from "@hono/zod-openapi";
import { BaseSchema } from "./base";

export const SubscriptionPlanSchema = BaseSchema.extend({
	name: z
		.enum(["Basic", "Pro", "Enterprise"])
		.describe("Name of the plan (e.g., Basic, Pro, Enterprise)"),
	billing_cycle: z
		.enum(["monthly", "yearly"])
		.describe("The billing cycle of the plan"),
	price: z.number().positive().describe("Price of the plan"),
	status: z.enum(["active", "inactive"]).describe("Status of the plan"),
}).openapi("SubscriptionPlan");

export const SubscriptionPlanInput = SubscriptionPlanSchema.omit({
	id: true,
}).openapi("SubscriptionPlanInput");

export type SubscriptionPlanInput = z.infer<typeof SubscriptionPlanInput>;
export type SubscriptionPlanSchema = z.infer<typeof SubscriptionPlanSchema>;
