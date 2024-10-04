import { InvoiceInput, InvoiceSchema } from "@/db/schema";
import { HTTPException } from "hono/http-exception";
import { createRoute, z } from "@hono/zod-openapi";
import { createAppInstance } from "@/lib/app";
import { endOfMonth, endOfYear, getDaysInMonth, getDaysInYear } from "date-fns";
import { getCustomerSubscriptionPlanByCustomerId } from "../customer/lib";

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
	},
});

invoiceRouter.openapi(post, async (c) => {
	const input = c.req.valid("json");

	const subscriptionPlan = await getCustomerSubscriptionPlanByCustomerId({
		db: c.var.db,
		input: {
			customer_id: input.customer_id,
		},
	});

	const billingCycle = subscriptionPlan.billing_cycle;
	const price = subscriptionPlan.price;

	const today = new Date();

	let dueDate: string;
	let proratedAmount: number;

	if (billingCycle === "monthly") {
		dueDate = endOfMonth(today).toISOString();

		const daysInMonth = getDaysInMonth(today);
		const remainingDays = daysInMonth - today.getDate() + 1;
		proratedAmount = (price / daysInMonth) * remainingDays;
	} else if (billingCycle === "yearly") {
		dueDate = endOfYear(today).toISOString();

		const daysInYear = getDaysInYear(today);
		const remainingDays = daysInYear - today.getDate() + 1;
		proratedAmount = (price / daysInYear) * remainingDays;
	} else {
		throw new HTTPException(500, {
			message: "Invalid billing cycle",
		});
	}

	const amount = Number(proratedAmount.toFixed(3));

	const id = await c.var.db.insert("invoice", {
		...input,
		amount,
		due_date: dueDate,
		payment_status: "pending",
		invoice_status: "generated",
	});
	const invoice = await c.var.db.get("invoice", id);

	if (!invoice) {
		throw new HTTPException(500, {
			message: `Failed to generate invoice for customer: ${input.customer_id}`,
		});
	}

	return c.json(invoice, 200);
});
