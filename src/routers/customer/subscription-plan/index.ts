import { createRoute, z } from "@hono/zod-openapi";
import { HTTPException } from "hono/http-exception";
import { createAppInstance, ErrorSchema } from "@/lib/app";
import { SubscriptionPlanSchema } from "@/db/models/subscription-plan";
import {
	createCustomerSubscriptionPlan,
	getCustomerActiveSubscriptionPlanByCustomerId,
} from "../lib";
import { formatISO } from "date-fns";
import { CustomerSubscriptionPlanSchema } from "@/db/models/customer-subscription-plan";

export const customerSubscriptionPlanRouter = createAppInstance();

const get = createRoute({
	method: "get",
	path: "/",
	summary: "Get a customer's active subscription plan",
	description: "Gets a customer's active subscription plan by their  ID",
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

	const { subscriptionPlan } =
		await getCustomerActiveSubscriptionPlanByCustomerId({
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
			description: "Updates a customer's subscription plan",
			content: {
				"application/json": {
					schema: CustomerSubscriptionPlanSchema,
				},
			},
		},
		404: {
			description: "Customer or subscription plan not found",
			content: {
				"application/json": {
					schema: ErrorSchema,
				},
			},
		},
		500: {
			description: "Failed to create new customer subscription plan",
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
		getCustomerActiveSubscriptionPlanByCustomerId({
			db: c.var.db,
			input: {
				customer_id: customer_id,
			},
		}),
		c.var.db.get("subscriptionPlan", new_subscription_plan_id),
	]);

	if (!originalPlan || !newPlan) {
		throw new HTTPException(404, { message: "Subscription plan not found" });
	}

	if (newPlan.status !== "inactive") {
		throw new HTTPException(400, {
			message: "New subscription plan is not inactive",
		});
	}

	const [, newCustomerSubscriptionPlanId] = await Promise.all([
		c.var.db.update(
			"customerSubscriptionPlan",
			originalPlan.customerSubscriptionPlan.id,
			{
				subscription_end_date: formatISO(new Date(), {
					representation: "date",
				}),
			},
		),
		createCustomerSubscriptionPlan({
			db: c.var.db,
			input: {
				customer_id: customer_id,
				subscription_plan_id: new_subscription_plan_id,
			},
		}),
	]);

	const newCustomerSubscriptionPlan = await c.var.db.get(
		"customerSubscriptionPlan",
		newCustomerSubscriptionPlanId,
	);

	if (!newCustomerSubscriptionPlan) {
		throw new HTTPException(500, {
			message: "Failed to create new customer subscription plan",
		});
	}

	return c.json(newCustomerSubscriptionPlan, 200);
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
					schema: CustomerSubscriptionPlanSchema,
				},
			},
		},
		404: {
			description: "Not found",
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
	const { customer_id } = c.req.valid("param");

	const { subscriptionPlan } =
		await getCustomerActiveSubscriptionPlanByCustomerId({
			db: c.var.db,
			input: {
				customer_id: customer_id,
			},
		});

	if (!subscriptionPlan) {
		throw new HTTPException(404, { message: "Subscription plan not found" });
	}

	const customerSubscriptionsPlans = await c.var.db.getAll(
		"customerSubscriptionPlan",
	);

	const customerSubscriptionPlanToCancel = customerSubscriptionsPlans.find(
		(subscriptionPlan) =>
			subscriptionPlan.customer_id === customer_id &&
			subscriptionPlan.subscription_cancel_date === null,
	);

	if (!customerSubscriptionPlanToCancel) {
		throw new HTTPException(404, {
			message: "Customer subscription plan not found",
		});
	}

	const updatedCustomerSubscriptionPlan = await c.var.db.update(
		"customerSubscriptionPlan",
		customerSubscriptionPlanToCancel.id,
		{
			subscription_cancel_date: formatISO(new Date(), {
				representation: "date",
			}),
		},
	);

	return c.json(updatedCustomerSubscriptionPlan, 200);
});
