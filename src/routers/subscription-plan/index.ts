import { createAppInstance } from "@/lib/app";
import { SubscriptionPlanInput, SubscriptionPlanSchema } from "@/db/schema";
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
	path: "/new",
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
					schema: SubscriptionPlanSchema.nullable(),
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
				plan.price === input.price,
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

const put = createRoute({
	method: "put",
	path: "/{id}",
	summary: "Update a subscription plan",
	description: "Updates a subscription plan with the provided details",
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
					schema: z.null(),
				},
			},
		},
	},
});

subscriptionPlanRouter.openapi(put, async (c) => {
	const { id } = c.req.valid("param");
	const input = c.req.valid("json");

	await c.var.db.update("subscriptionPlan", id, input);

	return c.json(null, 200);
});

const get = createRoute({
	method: "get",
	path: "/{id}",
	summary: "Get a subscription plan by ID",
	description: "Retrieves a subscription plan by its ID",
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
			description: "Returns a subscription plan",
			content: {
				"application/json": {
					schema: SubscriptionPlanSchema.nullable(),
				},
			},
		},
	},
});

subscriptionPlanRouter.openapi(get, async (c) => {
	const { id } = c.req.valid("param");
	const res = await c.var.db.get("subscriptionPlan", id);

	return c.json(res, 200);
});

const del = createRoute({
	method: "delete",
	path: "/{id}",
	summary: "Delete a subscription plan by ID",
	description: "Deletes a subscription plan by its ID",
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
			description: "Deletes a subscription plan",
			content: {
				"application/json": {
					schema: z.null(),
				},
			},
		},
	},
});

subscriptionPlanRouter.openapi(del, async (c) => {
	const { id } = c.req.valid("param");
	await c.var.db.delete("subscriptionPlan", id);
	return c.json(null, 200);
});
