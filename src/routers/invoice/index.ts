import { InvoiceInput, InvoiceSchema } from "@/db/schema";
import { HTTPException } from "hono/http-exception";
import { createRoute, z } from "@hono/zod-openapi";
import { createAppInstance } from "@/lib/app";
import { createInvoice } from "./lib";

export const invoiceRouter = createAppInstance();

const getAll = createRoute({
	method: "get",
	path: "/",
	summary: "Get all invoices",
	description: "Get all invoices",
	responses: {
		200: {
			description: "Invoices fetched successfully",
			content: {
				"application/json": {
					schema: z.array(InvoiceSchema),
				},
			},
		},
		500: {
			description: "Failed to fetch invoices",
		},
	},
});

invoiceRouter.openapi(getAll, async (c) => {
	const invoices = await c.var.db.getAll("invoice");
	return c.json(invoices, 200);
});

const post = createRoute({
	method: "post",
	path: "/",
	summary: "Generate an invoice",
	description: "Generate an invoice",
	request: {
		body: {
			content: {
				"application/json": {
					schema: InvoiceInput,
				},
			},
		},
	},
	responses: {
		200: {
			description: "Invoice generated",
			content: {
				"application/json": {
					schema: InvoiceSchema,
				},
			},
		},
		500: {
			description: "Failed to generate invoice",
		},
		404: {
			description: "Customer not found",
		},
	},
});

invoiceRouter.openapi(post, async (c) => {
	const input = c.req.valid("json");

	const invoice = await createInvoice(c.var.db, input.customer_id);

	const customer = await c.var.db.get("customer", input.customer_id);

	if (!customer) {
		throw new HTTPException(404, {
			message: "Customer not found",
		});
	}

	await c.var.sendEmail({
		to: customer.email,
		subject: "Invoice Generated",
		body: `Invoice generated for ${invoice.id}`,
		type: "text",
	});

	return c.json(invoice, 200);
});
