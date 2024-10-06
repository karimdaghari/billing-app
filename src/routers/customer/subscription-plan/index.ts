import { createRoute, z } from "@hono/zod-openapi";
import { HTTPException } from "hono/http-exception";
import { createAppInstance, ErrorSchema } from "@/lib/app";
import { calculateProratedAmount } from "@/services/billing";
import { CustomerSchema } from "@/db/models/customer";
import { SubscriptionPlanSchema } from "@/db/models/subscription-plan";
import { generateInvoice } from "@/services/invoice";
import { InvoiceSchema } from "@/db/models/invoice";
import { getCustomerSubscriptionPlanByCustomerId } from "../lib";

export const customerSubscriptionPlanRouter = createAppInstance();

const get = createRoute({
	method: "get",
	path: "/",
	summary: "Get a customer's subscription plan",
	description: "Gets a customer's subscription plan by their (customer) ID",
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
			description: "Gets a customer's subscription plan",
			content: {
				"application/json": {
					schema: SubscriptionPlanSchema,
				},
			},
		},
		400: {
			description: "Customer not found",
			content: {
				"application/json": {
					schema: ErrorSchema,
				},
			},
		},
		404: {
			description: "Subscription plan not found",
			content: {
				"application/json": {
					schema: ErrorSchema,
				},
			},
		},
	},
});

customerSubscriptionPlanRouter.openapi(get, async (c) => {
	const { customer_id } = c.req.valid("param");

	const subscriptionPlan = await getCustomerSubscriptionPlanByCustomerId({
		db: c.var.db,
		input: {
			customer_id: customer_id,
		},
	});

	return c.json(subscriptionPlan, 200);
});

const put = createRoute({
	method: "put",
	path: "/{customer_id}/subscription-plan",
	summary: "Update a customer's subscription plan",
	description:
		"Updates a customer's subscription plan and handles prorated billing",
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
						proratedInvoice: InvoiceSchema,
					}),
				},
			},
		},
		500: {
			description: "Failed to update customer subscription",
			content: {
				"application/json": {
					schema: ErrorSchema,
				},
			},
		},
	},
});

customerSubscriptionPlanRouter.openapi(put, async (c) => {
	const { customer_id } = c.req.valid("param");
	const { new_subscription_plan_id } = c.req.valid("json");

	const customer = await c.var.db.get("customer", customer_id);
	if (!customer) {
		throw new HTTPException(404, { message: "Customer not found" });
	}

	const [originalPlan, newPlan] = await Promise.all([
		c.var.db.get("subscriptionPlan", customer.subscription_plan_id),
		c.var.db.get("subscriptionPlan", new_subscription_plan_id),
	]);

	if (!originalPlan || !newPlan) {
		throw new HTTPException(404, { message: "Subscription plan not found" });
	}

	const changeDate = new Date();
	const proratedAmount = calculateProratedAmount({
		originalPlan,
		newPlan,
		changeDate,
	});

	const proratedInvoice = await generateInvoice({
		ctx: c,
		input: {
			customer_id: customer_id,
			proratedAmount,
		},
	});

	if (!proratedInvoice) {
		throw new HTTPException(500, {
			message: "Failed to create prorated invoice",
		});
	}

	// Update customer's subscription
	const updatedCustomer = await c.var.db.update("customer", customer_id, {
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
			proratedInvoice: { ...proratedInvoice, customer_id: customer_id },
		},
		200,
	);
});

const cancelRoute = createRoute({
	method: "put",
	path: "/{customer_id}/subscription-plan/cancel",
	summary: "Cancel a customer's active subscription plan",
	description: "Cancels a customer's active subscription plan",
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
			description: "Cancels a customer's active subscription plan",
			content: {
				"application/json": {
					schema: CustomerSchema,
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
		400: {
			description: "Customer does not have an active subscription",
			content: {
				"application/json": {
					schema: ErrorSchema,
				},
			},
		},
		500: {
			description: "Failed to cancel customer subscription",
			content: {
				"application/json": {
					schema: ErrorSchema,
				},
			},
		},
	},
});

customerSubscriptionPlanRouter.openapi(cancelRoute, async (c) => {
	const { customer_id: id } = c.req.valid("param");

	const customer = await c.var.db.get("customer", id);
	if (!customer) {
		throw new HTTPException(404, { message: "Customer not found" });
	}

	if (customer.subscription_status !== "active") {
		throw new HTTPException(400, {
			message: "Customer does not have an active subscription",
		});
	}

	const updatedCustomer = await c.var.db.update("customer", id, {
		subscription_status: "cancelled",
	});

	if (!updatedCustomer) {
		throw new HTTPException(500, {
			message: "Failed to cancel customer subscription",
		});
	}

	return c.json(updatedCustomer, 200);
});
