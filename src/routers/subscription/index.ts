import { createAppInstance } from "@/lib/app";
import { SubscriptionPlanInput, SubscriptionPlanSchema } from "@/db/schema";
import { createRoute, z } from "@hono/zod-openapi";
import { createAPIResponseSchema } from "@/lib/api-helpers";

export const subscriptionRouter = createAppInstance();

const GetAllParamsSchema = z.object({
	ids: z
		.array(z.string())
		.optional()
		.openapi({
			param: {
				name: "ids",
				in: "query",
			},
		}),
});

const getAll = createRoute({
	method: "get",
	path: "/all",
	summary: "Get all subscription plans",
	description: "Retrieves all subscription plans from the database",
	request: {
		query: GetAllParamsSchema,
	},
	responses: {
		200: {
			description: "Returns all subscription plans",
			content: {
				"application/json": {
					schema: createAPIResponseSchema(z.array(SubscriptionPlanSchema)),
				},
			},
		},
	},
});

subscriptionRouter.openapi(getAll, async (c) => {
	const { ids } = c.req.valid("query");
	const res = await c.var.db.getAll("subscriptionPlan", ids);
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
		200: {
			description: "Creates a new subscription plan",
			content: {
				"application/json": {
					schema: createAPIResponseSchema(SubscriptionPlanSchema),
				},
			},
		},
	},
});

subscriptionRouter.openapi(post, async (c) => {
	const input = c.req.valid("json");
	const res = await c.var.db.insert("subscriptionPlan", input);

	return c.json(res, 200);
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
					schema: SubscriptionPlanInput,
				},
			},
		},
	},
	responses: {
		200: {
			description: "Updates a subscription plan",
			content: {
				"application/json": {
					schema: createAPIResponseSchema(SubscriptionPlanSchema),
				},
			},
		},
	},
});

subscriptionRouter.openapi(put, async (c) => {
	const { id } = c.req.valid("param");
	const input = c.req.valid("json");

	const res = await c.var.db.update("subscriptionPlan", id, input);

	return c.json(res, 200);
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
					schema: createAPIResponseSchema(SubscriptionPlanSchema),
				},
			},
		},
	},
});

subscriptionRouter.openapi(get, async (c) => {
	const { id } = c.req.valid("param");
	const res = await c.var.db.get("subscriptionPlan", id);

	return c.json(res, 200);
});
