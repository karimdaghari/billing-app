import type { CustomerSchema } from "@/db/models/customer";
import type { InvoiceSchema } from "@/db/models/invoice";
import { PaymentSchema } from "@/db/models/payment";
import type { HonoContext } from "@/lib/app";
import type { z } from "@hono/zod-openapi";
import { HTTPException } from "hono/http-exception";

const Input = PaymentSchema.pick({ id: true });
type Input = z.infer<typeof Input>;

export async function processPayment({
	ctx,
	input,
}: {
	ctx: HonoContext;
	input: Input;
}) {
	const { id } = Input.parse(input);

	const payment = await ctx.var.db.get("payment", id);

	if (!payment) {
		throw new HTTPException(404, {
			message: "Payment not found",
		});
	}

	const invoice = await ctx.var.db.get("invoice", payment.invoice_id);

	if (!invoice) {
		throw new HTTPException(404, {
			message: "Invoice not found",
		});
	}

	if (invoice.payment_status === "paid") {
		return;
	}

	if (invoice.payment_retry_count >= 3) {
		await ctx.var.db.update("invoice", invoice.id, {
			payment_status: "failed",
			invoice_status: "overdue",
		});
		throw new HTTPException(500, {
			message: "Payment failed after 3 retries",
		});
	}

	const customer = await ctx.var.db.get("customer", invoice.customer_id);

	if (!customer) {
		throw new HTTPException(404, {
			message: "Customer not found",
		});
	}

	const sendEmail = ctx.var.sendEmail;

	try {
		await handleGatewayPayment({
			c: ctx,
			input: { payment, invoice, customer },
		});

		await Promise.all([
			ctx.var.db.update("invoice", invoice.id, {
				payment_status: "paid",
				invoice_status: "paid",
			}),
			sendEmail({
				to: customer.email,
				subject: "Payment Successful",
				body: `Payment successful for invoice: ${invoice.id}`,
				type: "text",
			}),
		]);
	} catch (error) {
		await Promise.all([
			ctx.var.db.update("invoice", invoice.id, {
				payment_status: "failed",
				payment_retry_count: invoice.payment_retry_count + 1,
			}),
			sendEmail({
				to: customer.email,
				subject: "Payment Failed",
				body: `Payment failed for invoice: ${invoice.id}`,
				type: "text",
			}),
		]);
		throw new HTTPException(500, {
			message: "Failed to process payment",
			cause: error,
		});
	}
}

interface HandleGatewayPaymentParams {
	c: HonoContext;
	input: {
		payment: PaymentSchema;
		invoice: InvoiceSchema;
		customer: CustomerSchema;
	};
}

const handleGatewayPayment = async ({
	c,
	input,
}: HandleGatewayPaymentParams) => {
	// Here we would probably call the payment gateway's API to process the payment (e.g., Stripe, PayPal, etc.)
	throw new Error("Not implemented");
};
