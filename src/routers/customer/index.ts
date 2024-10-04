import { createAppInstance } from "@/lib/app";
import { CustomerInput, CustomerSchema } from "@/db/schema";
import { createRoute, z } from "@hono/zod-openapi";
import { HTTPException } from "hono/http-exception";
import { checkCustomerEmailIsUnique } from "./lib";

export const customerRouter = createAppInstance();

const getAll = createRoute({
	method: "get",
	path: "/all",
	summary: "Get all customers",
	description: "Retrieves all customers",
	responses: {
		200: {
			description: "Retrieves all customers",
			content: {
				"application/json": {
					schema: CustomerSchema.array(),
				},
			},
		},
	},
});

customerRouter.openapi(getAll, async (c) => {
	const res = await c.var.db.getAll("customer");
	return c.json(res, 200);
});

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
					schema: CustomerSchema.nullable(),
				},
			},
		},
	},
});

customerRouter.openapi(get, async (c) => {
	const { id } = c.req.valid("param");
	const res = await c.var.db.get("customer", id);
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
		201: {
			description: "Creates a new customer",
			content: {
				"application/json": {
					schema: CustomerSchema,
				},
			},
		},
	},
});

customerRouter.openapi(post, async (c) => {
	const customer = c.req.valid("json");

	const plan = await c.var.db.get(
		"subscriptionPlan",
		customer.subscription_plan_id,
	);

	if (!plan) {
		throw new HTTPException(404, {
			message: "Subscription plan not found",
		});
	}

	if (plan.status === "inactive") {
		throw new HTTPException(400, {
			message: "Subscription plan is inactive",
		});
	}

	const allCustomers = await c.var.db.getAll("customer");

	if (checkCustomerEmailIsUnique({ allCustomers, email: customer.email })) {
		throw new HTTPException(400, {
			message: "Customer already exists",
		});
	}

	const id = await c.var.db.insert("customer", customer);

	const res = await c.var.db.get("customer", id);

	if (!res) {
		throw new HTTPException(500, {
			message: "Failed to create customer",
		});
	}

	return c.json(res, 201);
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
					schema: CustomerInput.partial(),
				},
			},
		},
	},
	responses: {
		200: {
			description: "Updates a customer",
			content: {
				"application/json": {
					schema: z.null(),
				},
			},
		},
	},
});

customerRouter.openapi(put, async (c) => {
	const { id } = c.req.valid("param");
	const input = c.req.valid("json");

	const allCustomers = await c.var.db.getAll("customer");

	if (
		input.email &&
		checkCustomerEmailIsUnique({ allCustomers, email: input.email })
	) {
		throw new HTTPException(400, {
			message: "The email must be unique",
		});
	}

	try {
		await c.var.db.update("customer", id, input);
		return c.json(null, 200);
	} catch (error) {
		console.error(error);
		throw new HTTPException(500, {
			message: "Failed to update customer",
		});
	}
});

const del = createRoute({
	method: "delete",
	path: "/{id}",
	summary: "Delete a customer",
	description: "Deletes a customer by their ID",
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
			description: "Deletes a customer",
			content: {
				"application/json": {
					schema: z.null(),
				},
			},
		},
	},
});

customerRouter.openapi(del, async (c) => {
	const { id } = c.req.valid("param");

	await c.var.db.delete("customer", id);
	return c.json(null, 200);
});
