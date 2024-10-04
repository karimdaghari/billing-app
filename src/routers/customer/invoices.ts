import { createAppInstance } from "@/lib/app";
import { InvoiceSchema } from "@/db/schema";
import { createRoute, z } from "@hono/zod-openapi";
import { HTTPException } from "hono/http-exception";

export const customerInvoicesRouter = createAppInstance();

const getCustomerInvoices = createRoute({
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

customerInvoicesRouter.openapi(getCustomerInvoices, async (c) => {
	const { id } = c.req.valid("param");

	// Check if the customer exists
	const customer = await c.var.db.get("customer", id);
	if (!customer) {
		throw new HTTPException(404, { message: "Customer not found" });
	}

	// Fetch all invoices
	const allInvoices = await c.var.db.getAll("invoice");

	// Filter invoices for the specific customer
	const customerInvoices = allInvoices.filter(
		(invoice) => invoice.customer_id === id,
	);

	return c.json(customerInvoices, 200);
});
