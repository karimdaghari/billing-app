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
