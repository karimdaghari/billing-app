import { createAppInstance, ErrorSchema } from "@/lib/app";
import { InvoiceSchema } from "@/db/models/invoice";
import { createRoute, z } from "@hono/zod-openapi";
import { HTTPException } from "hono/http-exception";

export const customerInvoiceRouter = createAppInstance();

const get = createRoute({
	method: "get",
	path: "/all",
	summary: "Get customer's invoices",
	description: "Retrieves all invoices for a specific customer",
	request: {
		params: z.object({
			customer_id: z
				.string()
				.uuid()
				.openapi({
					param: {
						name: "customer_id",
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
			content: {
				"application/json": {
					schema: ErrorSchema,
				},
			},
		},
	},
});

customerInvoiceRouter.openapi(get, async (c) => {
	const { customer_id } = c.req.valid("param");

	const [customer, allInvoices] = await Promise.all([
		c.var.db.get("customer", customer_id),
		c.var.db.getAll("invoice"),
	]);

	if (!customer) {
		throw new HTTPException(404, { message: "Customer not found" });
	}

	const customerInvoices = allInvoices.filter(
		(invoice) => invoice.customer_id === customer_id,
	);

	return c.json(customerInvoices, 200);
});
