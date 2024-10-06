import { BaseSchema } from "./base";
import { z } from "@hono/zod-openapi";

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
		.date()
		.describe("Date when the payment was made")
		.openapi({
			example: "2024-04-20",
			format: "date",
		}),
}).openapi("Payment");

export const PaymentInput = PaymentSchema.omit({
	id: true,
}).openapi("PaymentInput");

export type PaymentInput = z.infer<typeof PaymentInput>;
export type PaymentSchema = z.infer<typeof PaymentSchema>;
