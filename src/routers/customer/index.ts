import { createAppInstance, ErrorSchema, ResponseSchema } from "@/lib/app";
import { CustomerInput, CustomerSchema } from "@/db/models/customer";
import { createRoute, z } from "@hono/zod-openapi";
import { HTTPException } from "hono/http-exception";
import {
	checkCustomerEmailIsUnique,
	createCustomerSubscriptionPlan,
} from "./lib";

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
	path: "/{customer_id}",
	summary: "Get a customer by ID",
	description: "Retrieves a customer by their ID",
	request: {
		params: z.object({
			customer_id: z.string().openapi({
				param: {
					name: "customer_id",
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
		404: {
			description: "Customer not found",
			content: {
				"application/json": {
					schema: ErrorSchema,
				},
			},
		},
	},
});

customerRouter.openapi(get, async (c) => {
	const { customer_id } = c.req.valid("param");
	const res = await c.var.db.get("customer", customer_id);
	if (!res) {
		throw new HTTPException(404, {
			message: "Customer not found",
		});
	}
	return c.json(res, 200);
});

const post = createRoute({
	method: "post",
	path: "/",
	summary: "Create a new customer",
	description: "Creates a new customer with the provided details",
	request: {
		body: {
			content: {
				"application/json": {
					schema: CustomerInput.extend({
						subscription_plan_id: z.string().uuid(),
					}),
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
		400: {
			description: "Bad Request",
			content: {
				"application/json": {
					schema: ErrorSchema,
				},
			},
		},
		404: {
			description: "Not Found",
			content: {
				"application/json": {
					schema: ErrorSchema,
				},
			},
		},
		500: {
			description: "Internal Server Error",
			content: {
				"application/json": {
					schema: ErrorSchema,
				},
			},
		},
	},
});

customerRouter.openapi(post, async (c) => {
	const input = c.req.valid("json");

	const allCustomers = await c.var.db.getAll("customer");

	if (!checkCustomerEmailIsUnique({ allCustomers, email: input.email })) {
		throw new HTTPException(400, {
			message: "The email must be unique",
		});
	}

	const customerId = await c.var.db.insert("customer", input);

	try {
		await createCustomerSubscriptionPlan({
			db: c.var.db,
			input: {
				customer_id: customerId,
				subscription_plan_id: input.subscription_plan_id,
			},
		});
	} catch (error) {
		// If there's an error creating the subscription plan, delete the customer
		await c.var.db.delete("customer", customerId);
		throw error;
	}

	const res = await c.var.db.get("customer", customerId);

	if (!res) {
		throw new HTTPException(500, {
			message: "Failed to create customer",
		});
	}

	return c.json(res, 201);
});

const patch = createRoute({
	method: "patch",
	path: "/{customer_id}",
	summary: "Update a customer",
	description: "Updates a customer with the provided details",
	request: {
		params: z.object({
			customer_id: z.string().openapi({
				param: {
					name: "customer_id",
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
					schema: CustomerSchema,
				},
			},
		},
		500: {
			description: "Failed to update customer",
			content: {
				"application/json": {
					schema: ErrorSchema,
				},
			},
		},
	},
});

customerRouter.openapi(patch, async (c) => {
	const { customer_id: id } = c.req.valid("param");
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
		const res = await c.var.db.update("customer", id, input);
		return c.json(res, 200);
	} catch (error) {
		throw new HTTPException(500, {
			message: "Failed to update customer",
			cause: error,
		});
	}
});

const del = createRoute({
	method: "delete",
	path: "/{customer_id}",
	summary: "Delete a customer",
	description: "Deletes a customer by their ID",
	request: {
		params: z.object({
			customer_id: z.string().openapi({
				param: {
					name: "customer_id",
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
					schema: ResponseSchema,
				},
			},
		},
		500: {
			description: "Failed to delete customer",
			content: {
				"application/json": {
					schema: ErrorSchema,
				},
			},
		},
	},
});

customerRouter.openapi(del, async (c) => {
	const { customer_id } = c.req.valid("param");

	const customersWithSubscriptionPlans = await c.var.db.getAll(
		"customerSubscriptionPlan",
	);
	const customerSubscriptionPlan = customersWithSubscriptionPlans.find(
		(csp) => csp.customer_id === customer_id,
	);

	if (customerSubscriptionPlan) {
		throw new HTTPException(400, {
			message: "Customer has an active subscription plan",
		});
	}

	const res = await c.var.db.delete("customer", customer_id);
	if (!res) {
		throw new HTTPException(500, {
			message: "Failed to delete customer",
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
