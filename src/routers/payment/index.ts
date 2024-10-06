import { PaymentInput, PaymentSchema } from "@/db/models/payment";
import { createAppInstance, ErrorSchema } from "@/lib/app";
import { processPayment } from "@/services/payment";
import { createRoute } from "@hono/zod-openapi";
import { HTTPException } from "hono/http-exception";

export const paymentRouter = createAppInstance();

const post = createRoute({
	method: "post",
	path: "/",
	summary: "Create a payment",
	description: "Create a payment",
	request: {
		body: {
			content: {
				"application/json": {
					schema: PaymentInput,
				},
			},
		},
	},
	responses: {
		201: {
			description: "Created payment",
			content: {
				"application/json": {
					schema: PaymentSchema,
				},
			},
		},
		500: {
			description: "Failed to create payment",
			content: {
				"application/json": {
					schema: ErrorSchema,
				},
			},
		},
		406: {
			description: "Paid amount does not match invoice amount",
			content: {
				"application/json": {
					schema: ErrorSchema,
				},
			},
		},
		409: {
			description: "Invoice is already paid",
			content: {
				"application/json": {
					schema: ErrorSchema,
				},
			},
		},
		404: {
			description: "Invoice not found",
			content: {
				"application/json": {
					schema: ErrorSchema,
				},
			},
		},
	},
});

paymentRouter.openapi(post, async (c) => {
	const input = c.req.valid("json");

	const invoice = await c.var.db.get("invoice", input.invoice_id);

	if (!invoice) {
		throw new HTTPException(404, {
			message: `Invoice with id: ${input.invoice_id} not found`,
		});
	}

	if (invoice.payment_status === "paid") {
		throw new HTTPException(409, {
			message: `Invoice with id: ${input.invoice_id} is already paid`,
		});
	}

	const invoiceAmount = invoice.amount;
	const paidAmount = input.amount;

	if (paidAmount !== invoiceAmount) {
		throw new HTTPException(406, {
			message: `Paid amount: ${paidAmount} does not match invoice amount: ${invoiceAmount}`,
		});
	}

	const newPaymentId = await c.var.db.insert("payment", input);

	const payment = await c.var.db.get("payment", newPaymentId);

	if (!payment) {
		throw new HTTPException(500, {
			message: "Failed to create payment",
		});
	}

	try {
		await processPayment({
			db: c.var.db,
			sendEmail: c.var.sendEmail,
			input: { id: newPaymentId },
		});
	} catch (error) {
		// We don't need to do anything as the payment will be retried up to 3 times
	}

	return c.json(payment, 201);
});
