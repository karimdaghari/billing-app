import { createAppInstance } from "@/lib/app";
import { CustomerInput, CustomerSchema } from "@/db/schema";
import { createRoute, z } from "@hono/zod-openapi";
import { createAPIResponseSchema } from "@/lib/api-helpers";

export const customerRouter = createAppInstance();

const get = createRoute({
	method: "get",
	path: "/{id}",
	summary: "Get a customer by ID",
	description: "Retrieves a customer by their ID",
	request: {
		params: z.object({
			id: z.string().openapi({
				param: {
					name: "id",
					in: "path",
				},
			}),
		}),
	},
	responses: {
		200: {
			description: "Retrieves a customer by their ID",

			content: {
				"application/json": {
					schema: createAPIResponseSchema(CustomerSchema),
				},
			},
		},
	},
});

customerRouter.openapi(get, async (c) => {
	const { id } = c.req.valid("param");
	const db = c.get("db");

	const res = await db.get("customer", id);

	return c.json(res, 200);
});

const post = createRoute({
	method: "post",
	path: "/new",
	summary: "Create a new customer",
	description: "Creates a new customer with the provided details",
	request: {
		body: {
			content: {
				"application/json": {
					schema: CustomerInput,
				},
			},
		},
	},
	responses: {
		200: {
			description: "Creates a new customer",
			content: {
				"application/json": {
					schema: createAPIResponseSchema(CustomerSchema),
				},
			},
		},
	},
});

customerRouter.openapi(post, async (c) => {
	const customer = c.req.valid("json");
	const db = c.get("db");

	const res = await db.insert("customer", customer);

	return c.json(res, 200);
});

const put = createRoute({
	method: "put",
	path: "/{id}",
	summary: "Update a customer",
	description: "Updates a customer with the provided details",
	request: {
		params: z.object({
			id: z.string().openapi({
				param: {
					name: "id",
					in: "path",
				},
			}),
		}),
		body: {
			content: {
				"application/json": {
					schema: CustomerInput,
				},
			},
		},
	},
	responses: {
		200: {
			description: "Updates a customer",
			content: {
				"application/json": {
					schema: createAPIResponseSchema(CustomerSchema),
				},
			},
		},
	},
});

customerRouter.openapi(put, async (c) => {
	const { id } = c.req.valid("param");
	const input = c.req.valid("json");

	const res = await c.var.db.update("customer", id, input);

	return c.json(res, 200);
});
