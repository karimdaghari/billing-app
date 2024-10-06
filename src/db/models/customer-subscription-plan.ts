import { BaseSchema } from "./base";
import { z } from "@hono/zod-openapi";

export const CustomerSubscriptionPlanSchema = BaseSchema.extend({
	customer_id: z
		.string()
		.uuid()
		.describe("The customer associated with the subscription plan"),
	subscription_plan_id: z
		.string()
		.uuid()
		.describe("The subscription plan associated with the customer"),
	subscription_start_date: z
		.string()
		.date()
		.describe("Date when the subscription started")
		.openapi({
			example: "2024-04-20",
			format: "date",
		}),
	subscription_end_date: z
		.string()
		.date()
		.describe("Date when the subscription ended")
		.openapi({
			example: "2024-04-20",
			format: "date",
		}),
	subscription_cancel_date: z
		.string()
		.date()
		.nullable()
		.describe("Date when the subscription was cancelled")
		.openapi({
			example: "2024-04-20",
			format: "date",
		}),
	invoice_id: z.string().uuid().nullable().describe("The invoice ID"),
}).openapi("CustomerSubscriptionPlan");

export const CustomerSubscriptionPlanInput =
	CustomerSubscriptionPlanSchema.omit({
		id: true,
	}).openapi("CustomerSubscriptionPlanInput");

export type CustomerSubscriptionPlanInput = z.infer<
	typeof CustomerSubscriptionPlanInput
>;
export type CustomerSubscriptionPlanSchema = z.infer<
	typeof CustomerSubscriptionPlanSchema
>;
