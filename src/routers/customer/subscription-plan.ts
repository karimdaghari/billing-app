import { CustomerInput, SubscriptionPlanSchema } from "@/db/schema";
import { createRoute, z } from "@hono/zod-openapi";
import { HTTPException } from "hono/http-exception";
import { createAppInstance } from "@/lib/app";

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
	path: "/",
	summary: "Update a customer's subscription plan",
	description: "Updates a customer's subscription plan by their ID",
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
					schema: CustomerInput.pick({
						subscription_status: true,
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
					schema: z.null(),
				},
			},
		},
	},
});

customerSubscriptionPlanRouter.openapi(put, async (c) => {
	const { id } = c.req.valid("param");
	const input = c.req.valid("json");

	const customer = await c.var.db.get("customer", id);

	if (!customer) {
		throw new HTTPException(404, {
			message: "Customer not found",
		});
	}

	await c.var.db.update("customer", id, {
		subscription_status: input.subscription_status,
	});

	if (input.subscription_status === "cancelled") {
		// TODO: Cancel subscription
	}

	return c.json(null, 200);
});
