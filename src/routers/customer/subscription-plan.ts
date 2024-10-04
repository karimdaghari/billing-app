import {
	CustomerSchema,
	InvoiceInput,
	SubscriptionPlanSchema,
} from "@/db/schema";
import { createRoute, z } from "@hono/zod-openapi";
import { HTTPException } from "hono/http-exception";
import { createAppInstance } from "@/lib/app";
import {
	calculateProratedAmount,
	getBillingCycleEndDate,
} from "@/services/billing";
import { addDays } from "date-fns";

export const customerSubscriptionPlanRouter = createAppInstance();

const get = createRoute({
	method: "get",
	path: "/",
	summary: "Get a customer's subscription plan",
	description: "Gets a customer's subscription plan by their ID",
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
			description: "Gets a customer's subscription plan",
			content: {
				"application/json": {
					schema: SubscriptionPlanSchema,
				},
			},
		},
		400: {
			description: "Customer not found",
		},
		404: {
			description: "Subscription plan not found",
		},
	},
});

customerSubscriptionPlanRouter.openapi(get, async (c) => {
	const { id } = c.req.valid("param");

	const customer = await c.var.db.get("customer", id);

	if (!customer) {
		throw new HTTPException(400, {
			message: "Customer not found",
		});
	}

	const subscriptionPlan = await c.var.db.get(
		"subscriptionPlan",
		customer.subscription_plan_id,
	);

	if (!subscriptionPlan) {
		throw new HTTPException(404, {
			message: "Subscription plan not found",
		});
	}

	return c.json(subscriptionPlan, 200);
});

const put = createRoute({
	method: "put",
	path: "/{id}/subscription-plan",
	summary: "Update a customer's subscription plan",
	description:
		"Updates a customer's subscription plan and handles prorated billing",
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
		body: {
			content: {
				"application/json": {
					schema: z.object({
						new_subscription_plan_id: z.string().uuid(),
					}),
				},
			},
		},
	},
	responses: {
		200: {
			description:
				"Updates a customer's subscription plan and returns prorated invoice",
			content: {
				"application/json": {
					schema: z.object({
						customer: CustomerSchema,
						proratedInvoice: InvoiceInput,
					}),
				},
			},
		},
	},
});

customerSubscriptionPlanRouter.openapi(put, async (c) => {
	const { id } = c.req.valid("param");
	const { new_subscription_plan_id } = c.req.valid("json");

	const customer = await c.var.db.get("customer", id);
	if (!customer) {
		throw new HTTPException(404, { message: "Customer not found" });
	}

	const originalPlan = await c.var.db.get(
		"subscriptionPlan",
		customer.subscription_plan_id,
	);
	const newPlan = await c.var.db.get(
		"subscriptionPlan",
		new_subscription_plan_id,
	);
	if (!originalPlan || !newPlan) {
		throw new HTTPException(404, { message: "Subscription plan not found" });
	}

	const changeDate = new Date();
	const proratedAmount = calculateProratedAmount({
		originalPlan,
		newPlan,
		changeDate,
	});

	const billingCycleEndDate = getBillingCycleEndDate(
		changeDate,
		newPlan.billing_cycle,
	);
	const dueDate = addDays(billingCycleEndDate, 1);

	const invoiceId = await c.var.db.insert("invoice", {
		customer_id: id,
		amount: proratedAmount,
		due_date: dueDate.toISOString(),
		invoice_status: "generated",
		payment_status: "pending",
	});

	const proratedInvoice = await c.var.db.get("invoice", invoiceId);

	if (!proratedInvoice) {
		throw new HTTPException(500, {
			message: "Failed to create prorated invoice",
		});
	}

	// Update customer's subscription
	const updatedCustomer = await c.var.db.update("customer", id, {
		subscription_plan_id: new_subscription_plan_id,
		subscription_status: "active",
	});

	if (!updatedCustomer) {
		throw new HTTPException(500, {
			message: "Failed to update customer subscription",
		});
	}

	return c.json(
		{
			customer: updatedCustomer,
			proratedInvoice: { ...proratedInvoice, customer_id: id },
		},
		200,
	);
});
