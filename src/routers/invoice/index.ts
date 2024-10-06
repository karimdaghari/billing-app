import { InvoiceSchema } from "@/db/models/invoice";
import { createRoute, z } from "@hono/zod-openapi";
import { createAppInstance, ErrorSchema } from "@/lib/app";
import { generateInvoice } from "@/services/invoice";
import { HTTPException } from "hono/http-exception";

export const invoiceRouter = createAppInstance();

const getAll = createRoute({
	method: "get",
	path: "/all",
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
	},
});

invoiceRouter.openapi(getAll, async (c) => {
	const invoices = await c.var.db.getAll("invoice");
	return c.json(invoices, 200);
});

const post = createRoute({
	method: "post",
	path: "/all",
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
			description: "Failed to generate invoices",
			content: {
				"application/json": {
					schema: ErrorSchema,
				},
			},
		},
	},
});

invoiceRouter.openapi(post, async (c) => {
	const customers = await c.var.db.getAll("customer");
	const customersIds = customers
		.filter((customer) => customer.subscription_status === "active")
		.map((customer) => customer.id);

	const promises = customersIds.map((customerId) =>
		generateInvoice({
			ctx: c,
			input: {
				customer_id: customerId,
			},
		}),
	);

	const invoices = await Promise.all(promises).catch((error) => {
		throw new HTTPException(500, {
			message: "Failed to generate invoices",
			cause: error,
		});
	});

	return c.json(invoices, 200);
});
