import { z } from "@hono/zod-openapi";
import { BaseSchema } from "./base";

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
	payment_retry_count: z.number().default(0).describe("Number of retries"),
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
