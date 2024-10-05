import { createAppInstance } from "@/lib/app";
import { InvoiceSchema } from "@/db/models/invoice";
import { createRoute, z } from "@hono/zod-openapi";
import { HTTPException } from "hono/http-exception";
import { createInvoice } from "../invoice/lib";

export const customerInvoicesRouter = createAppInstance();

const get = createRoute({
	method: "get",
	path: "/",
	summary: "Get customer's invoices",
	description: "Retrieves all invoices for a specific customer",
	request: {
		params: z.object({
			id: z
				.string()
				.uuid()
				.openapi({
					param: {
						name: "id",
						in: "path",
						required: true,
					},
				}),
		}),
	},
	responses: {
		200: {
			description: "Successfully retrieved customer's invoices",
			content: {
				"application/json": {
					schema: z.array(InvoiceSchema),
				},
			},
		},
		404: {
			description: "Customer not found",
		},
	},
});

customerInvoicesRouter.openapi(get, async (c) => {
	const { id } = c.req.valid("param");

	const [customer, allInvoices] = await Promise.all([
		c.var.db.get("customer", id),
		c.var.db.getAll("invoice"),
	]);

	if (!customer) {
		throw new HTTPException(404, { message: "Customer not found" });
	}

	const customerInvoices = allInvoices.filter(
		(invoice) => invoice.customer_id === id,
	);

	return c.json(customerInvoices, 200);
});

const post = createRoute({
	method: "post",
	path: "/",
	summary: "Generate a new invoice for a customer",
	description: "Generates a new invoice for a specific customer",
	request: {
		params: z.object({
			id: z
				.string()
				.uuid()
				.openapi({ param: { name: "id", in: "path", required: true } }),
		}),
	},
	responses: {
		201: {
			description: "Invoice created successfully",
			content: {
				"application/json": {
					schema: InvoiceSchema,
				},
			},
		},
		500: {
			description: "Failed to generate invoice",
		},
	},
});

customerInvoicesRouter.openapi(post, async (c) => {
	const { id } = c.req.valid("param");

	try {
		const invoice = await createInvoice({
			ctx: c,
			input: {
				customer_id: id,
			},
		});
		return c.json(invoice, 201);
	} catch (error) {
		throw new HTTPException(500, {
			message: "Failed to generate invoice",
			cause: error,
		});
	}
});
