import { createAppInstance, ErrorSchema, ResponseSchema } from "@/lib/app";
import {
	SubscriptionPlanInput,
	SubscriptionPlanSchema,
} from "@/db/models/subscription-plan";
import { createRoute, z } from "@hono/zod-openapi";
import { HTTPException } from "hono/http-exception";

export const subscriptionPlanRouter = createAppInstance();

const getAll = createRoute({
	method: "get",
	path: "/all",
	summary: "Get all subscription plans",
	description: "Retrieves all subscription plans from the database",
	responses: {
		200: {
			description: "Returns all subscription plans",
			content: {
				"application/json": {
					schema: z.array(SubscriptionPlanSchema),
				},
			},
		},
	},
});

subscriptionPlanRouter.openapi(getAll, async (c) => {
	const res = await c.var.db.getAll("subscriptionPlan");
	return c.json(res, 200);
});

const post = createRoute({
	method: "post",
	path: "/",
	summary: "Create a new subscription plan",
	description: "Creates a new subscription plan with the provided details",
	request: {
		body: {
			content: {
				"application/json": {
					schema: SubscriptionPlanInput,
				},
			},
		},
	},
	responses: {
		201: {
			description: "Creates a new subscription plan",
			content: {
				"application/json": {
					schema: SubscriptionPlanSchema,
				},
			},
		},
		400: {
			description: "Subscription plan already exists",
			content: {
				"application/json": {
					schema: ErrorSchema,
				},
			},
		},
		500: {
			description: "Failed to create subscription plan",
			content: {
				"application/json": {
					schema: ErrorSchema,
				},
			},
		},
	},
});

subscriptionPlanRouter.openapi(post, async (c) => {
	const input = c.req.valid("json");

	const allPlans = await c.var.db.getAll("subscriptionPlan");

	if (
		allPlans.some(
			(plan) =>
				plan.name === input.name &&
				plan.billing_cycle === input.billing_cycle &&
				plan.status === input.status,
		)
	) {
		throw new HTTPException(400, {
			message: "Subscription plan already exists",
		});
	}

	const id = await c.var.db.insert("subscriptionPlan", input);
	const res = await c.var.db.get("subscriptionPlan", id);

	if (!res) {
		throw new HTTPException(500, {
			message: "Failed to create subscription plan",
		});
	}

	return c.json(res, 201);
});

const patch = createRoute({
	method: "patch",
	path: "/{subscription_plan_id}",
	summary: "Update a subscription plan",
	description: "Updates a subscription plan with the provided details",
	request: {
		params: z.object({
			subscription_plan_id: z
				.string()
				.uuid()
				.openapi({
					param: {
						name: "subscription_plan_id",
						in: "path",
						required: true,
					},
				}),
		}),
		body: {
			content: {
				"application/json": {
					schema: SubscriptionPlanInput.partial(),
				},
			},
		},
	},
	responses: {
		200: {
			description: "Updates a subscription plan",
			content: {
				"application/json": {
					schema: SubscriptionPlanSchema,
				},
			},
		},
		500: {
			description: "Failed to update subscription plan",
			content: {
				"application/json": {
					schema: ErrorSchema,
				},
			},
		},
	},
});

subscriptionPlanRouter.openapi(patch, async (c) => {
	const { subscription_plan_id } = c.req.valid("param");
	const input = c.req.valid("json");

	const res = await c.var.db.update(
		"subscriptionPlan",
		subscription_plan_id,
		input,
	);

	if (!res) {
		throw new HTTPException(500, {
			message: "Failed to update subscription plan",
		});
	}

	return c.json(res, 200);
});

const get = createRoute({
	method: "get",
	path: "/{subscription_plan_id}",
	summary: "Get a subscription plan by ID",
	description: "Retrieves a subscription plan by its ID",
	request: {
		params: z.object({
			subscription_plan_id: z
				.string()
				.uuid()
				.openapi({
					param: {
						name: "subscription_plan_id",
						in: "path",
						required: true,
					},
				}),
		}),
	},
	responses: {
		200: {
			description: "Returns a subscription plan",
			content: {
				"application/json": {
					schema: SubscriptionPlanSchema,
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

subscriptionPlanRouter.openapi(get, async (c) => {
	const { subscription_plan_id } = c.req.valid("param");
	const res = await c.var.db.get("subscriptionPlan", subscription_plan_id);

	if (!res) {
		throw new HTTPException(404, {
			message: "Subscription plan not found",
		});
	}

	return c.json(res, 200);
});

const del = createRoute({
	method: "delete",
	path: "/{subscription_plan_id}",
	summary: "Delete a subscription plan by ID",
	description: "Deletes a subscription plan by its ID",
	request: {
		params: z.object({
			subscription_plan_id: z
				.string()
				.uuid()
				.openapi({
					param: {
						name: "subscription_plan_id",
						in: "path",
						required: true,
					},
				}),
		}),
	},
	responses: {
		200: {
			description: "Deletes a subscription plan",
			content: {
				"application/json": {
					schema: ResponseSchema,
				},
			},
		},
		500: {
			description: "Failed to delete subscription plan",
			content: {
				"application/json": {
					schema: ErrorSchema,
				},
			},
		},
		400: {
			description: "Subscription plan is still being used by a customer",
			content: {
				"application/json": {
					schema: ErrorSchema,
				},
			},
		},
	},
});

subscriptionPlanRouter.openapi(del, async (c) => {
	const { subscription_plan_id } = c.req.valid("param");

	const allCustomersSubscriptionsPlans = await c.var.db.getAll(
		"customerSubscriptionPlan",
	);

	if (
		allCustomersSubscriptionsPlans.some(
			(customer) =>
				customer.subscription_plan_id === subscription_plan_id &&
				customer.invoice_id !== null,
		)
	) {
		throw new HTTPException(400, {
			message: "Subscription plan is still being used by a customer",
		});
	}

	const res = await c.var.db.delete("subscriptionPlan", subscription_plan_id);

	if (!res) {
		throw new HTTPException(500, {
			message: "Failed to delete subscription plan",
		});
	}

	return c.json(
		{
			code: 200,
			message: "OK",
		},
		200,
	);
});
