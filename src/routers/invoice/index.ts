import { InvoiceSchema } from "@/db/models/invoice";
import { createRoute, z } from "@hono/zod-openapi";
import { createAppInstance } from "@/lib/app";
import { createInvoice } from "./lib";
import { HTTPException } from "hono/http-exception";

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
	summary: "Generate all invoices",
	description: "Generate all invoices",
	responses: {
		200: {
			description: "Invoice generated",
			content: {
				"application/json": {
					schema: InvoiceSchema.array(),
				},
			},
		},
		500: {
			description: "Failed to generate invoice",
		},
	},
});

invoiceRouter.openapi(post, async (c) => {
	const customers = await c.var.db.getAll("customer");
	const customersIds = customers.map((customer) => customer.id);

	const promises = customersIds.map((customerId) =>
		createInvoice({
			ctx: c,
			input: {
				customer_id: customerId,
			},
		}),
	);

	const invoices = await Promise.all(promises).catch((error) => {
		throw new HTTPException(500, {
			message: "Failed to generate invoice",
			cause: error,
		});
	});

	return c.json(invoices, 200);
});
