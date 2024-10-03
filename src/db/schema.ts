import { z } from "@hono/zod-openapi";
import BigNumber from "bignumber.js";

// Customer Schema
export const CustomerSchema = z
	.object({
		id: z.string().uuid().describe("Unique identifier for the customer"),
		name: z.string().describe("Customer's name"),
		email: z.string().email().describe("Customer's email address"),
		subscription_plan_id: z
			.string()
			.uuid()
			.describe("The current subscription plan the customer is on"),
	})
	.openapi("Customer");

export const CustomerInput = CustomerSchema.omit({
	id: true,
}).openapi("CustomerInput");

export type CustomerInput = z.infer<typeof CustomerInput>;
export type CustomerSchema = z.infer<typeof CustomerSchema>;

// SubscriptionPlan Schema
export const SubscriptionPlanSchema = z
	.object({
		id: z
			.string()
			.uuid()
			.describe("Unique identifier for the subscription plan"),
		name: z
			.enum(["Basic", "Pro", "Enterprise"])
			.describe("Name of the plan (e.g., Basic, Pro, Enterprise)"),
		billing_cycle: z
			.enum(["monthly", "yearly"])
			.describe("The billing cycle of the plan"),
		price: z
			.string()
			.refine(
				(value) => {
					try {
						const amount = BigNumber(value);
						return !amount.isNaN() && amount.isPositive();
					} catch {
						return false;
					}
				},
				{
					message: "Amount must be a valid positive number",
				},
			)
			.describe("Price of the plan")
			.openapi({
				example: "100",
			}),
		status: z.enum(["active", "inactive"]).describe("Status of the plan"),
	})
	.openapi("SubscriptionPlan");

export const SubscriptionPlanInput = SubscriptionPlanSchema.omit({
	id: true,
}).openapi("SubscriptionPlanInput");

export type SubscriptionPlanInput = z.infer<typeof SubscriptionPlanInput>;
export type SubscriptionPlanSchema = z.infer<typeof SubscriptionPlanSchema>;

// Invoice Schema
export const InvoiceSchema = z
	.object({
		id: z.string().uuid().describe("Unique identifier for the invoice"),
		customer_id: z
			.string()
			.uuid()
			.describe("The id of the customer associated with the invoice"),
		amount: z
			.string()
			.refine(
				(value) => {
					try {
						return !BigNumber(value).isNaN();
					} catch {
						return false;
					}
				},
				{
					message: "Amount must be a valid number",
				},
			)
			.describe("Total amount due"),
		due_date: z.string().datetime().describe("The date the payment is due"),
		payment_status: z
			.enum(["pending", "paid", "failed"])
			.describe("Status of the payment"),
		invoice_status: z
			.enum(["generated", "sent", "paid", "overdue"])
			.describe("Status of the invoice"),
	})
	.openapi("Invoice");

export const InvoiceInput = InvoiceSchema.omit({
	id: true,
}).openapi("InvoiceInput");

export type InvoiceInput = z.infer<typeof InvoiceInput>;
export type InvoiceSchema = z.infer<typeof InvoiceSchema>;

// Payment Schema
export const PaymentSchema = z
	.object({
		id: z.string().uuid().describe("Unique identifier for the payment"),
		invoice_id: z
			.string()
			.uuid()
			.describe("The invoice associated with the payment"),
		amount: z.number().positive().describe("Amount paid"),
		payment_method: z
			.enum(["credit card", "PayPal"])
			.describe("Method of payment"),
		payment_date: z
			.string()
			.datetime()
			.describe("Date when the payment was made"),
	})
	.openapi("Payment");

export const PaymentInput = PaymentSchema.omit({
	id: true,
}).openapi("PaymentInput");

export type PaymentInput = z.infer<typeof PaymentInput>;
export type PaymentSchema = z.infer<typeof PaymentSchema>;
