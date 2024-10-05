import type { DBClient } from "@/db/client";
import { InvoiceInput } from "@/db/models/invoice";
import type { CustomerSchema } from "@/db/models/customer";
import type { z } from "@hono/zod-openapi";
import { HTTPException } from "hono/http-exception";

export const checkCustomerEmailIsUnique = ({
	allCustomers,
	email,
}: {
	allCustomers: CustomerSchema[];
	email: string;
}) => allCustomers.every((c) => c.email !== email);

const ParamsSchema = InvoiceInput.pick({ customer_id: true });

export const getCustomerSubscriptionPlanByCustomerId = async ({
	db,
	input,
}: {
	input: z.infer<typeof ParamsSchema>;
	db: DBClient;
}) => {
	const validatedInput = ParamsSchema.parse(input);

	const customer = await db.get("customer", validatedInput.customer_id);

	if (!customer) {
		throw new HTTPException(404, {
			message: `Customer with id: ${validatedInput.customer_id} not found`,
		});
	}

	const subscriptionPlan = await db.get(
		"subscriptionPlan",
		customer.subscription_plan_id,
	);

	if (!subscriptionPlan) {
		throw new HTTPException(404, {
			message: `Subscription plan with id: ${customer.subscription_plan_id} not found`,
		});
	}

	return subscriptionPlan;
};
