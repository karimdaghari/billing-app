import type { DBClient } from "@/db/client";
import { PaymentInput, PaymentSchema } from "@/db/schema";
import { createAppInstance } from "@/lib/app";
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
		200: {
			description: "Created payment",
			content: {
				"application/json": {
					schema: PaymentSchema,
				},
			},
		},
		500: {
			description: "Failed to create payment",
		},
		406: {
			description: "Paid amount does not match invoice amount",
		},
		409: {
			description: "Invoice is already paid",
		},
		404: {
			description: "Invoice not found",
		},
	},
});

paymentRouter.openapi(post, async (c) => {
	const input = c.req.valid("json");

	const payment = await createPayment({
		db: c.var.db,
		input,
	});

	return c.json(payment);
});

async function createPayment({
	db,
	input,
}: {
	db: DBClient;
	input: PaymentInput;
}) {
	const invoice = await db.get("invoice", input.invoice_id);

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

	const id = await db.insert("payment", input);
	const payment = await db.get("payment", id);

	if (!payment) {
		await db.update("invoice", invoice.id, {
			payment_status: "failed",
		});
		throw new HTTPException(500, {
			message: "Failed to create payment",
		});
	}

	await db.update("invoice", invoice.id, {
		payment_status: "paid",
		invoice_status: "paid",
	});

	return payment;
}
