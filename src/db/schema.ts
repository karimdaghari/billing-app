import { z } from "@hono/zod-openapi";

const BaseSchema = z.object({
	id: z.string().uuid().describe("Unique identifier for the entity"),
});

// Customer Schema
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

// SubscriptionPlan Schema
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

// Invoice Schema
export const InvoiceSchema = BaseSchema.extend({
	customer_id: z
		.string()
		.uuid()
		.describe("The id of the customer associated with the invoice"),
	amount: z.number().positive().describe("Total amount due"),
	due_date: z.string().datetime().describe("The date the payment is due"),
	payment_status: z
		.enum(["pending", "paid", "failed"])
		.describe("Status of the payment"),
	invoice_status: z.enum(["generated", "sent", "paid", "overdue"]).describe(
		`Status of the invoice. 
		generated: The invoice has been generated.
		paid: The invoice has been paid and generated.
		sent: The invoice has been paid, generated and sent to the customer.
		overdue: The invoice is overdue.`,
	),
}).openapi("Invoice");

export const InvoiceInput = InvoiceSchema.pick({
	customer_id: true,
}).openapi("InvoiceInput");

export type InvoiceInput = z.infer<typeof InvoiceInput>;
export type InvoiceSchema = z.infer<typeof InvoiceSchema>;

// Payment Schema
export const PaymentSchema = BaseSchema.extend({
	invoice_id: z
		.string()
		.uuid()
		.describe("The invoice associated with the payment"),
	amount: z.number().positive().describe("Amount paid"),
	payment_method: z
		.enum(["CreditCard", "PayPal"])
		.describe("Method of payment"),
	payment_date: z
		.string()
		.datetime()
		.describe("Date when the payment was made")
		.openapi({
			example: "2024-02-20T10:00:00.000Z",
			format: "date-time",
		}),
}).openapi("Payment");

export const PaymentInput = PaymentSchema.omit({
	id: true,
}).openapi("PaymentInput");

export type PaymentInput = z.infer<typeof PaymentInput>;
export type PaymentSchema = z.infer<typeof PaymentSchema>;
