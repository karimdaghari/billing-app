import type { DBClient } from "@/db/client";
import type { CustomerSchema } from "@/db/models/customer";
import { InvoiceInput } from "@/db/models/invoice";
import { compareDesc, addMonths, addYears, formatISO } from "date-fns";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";

export const checkCustomerEmailIsUnique = ({
	allCustomers,
	email,
}: {
	allCustomers: CustomerSchema[];
	email: string;
}) => allCustomers.every((c) => c.email !== email);

const ParamsSchema = InvoiceInput.pick({ customer_id: true });

export async function getCustomerActiveSubscriptionPlanByCustomerId({
	db,
	input,
}: {
	input: z.infer<typeof ParamsSchema>;
	db: DBClient;
}) {
	const validatedInput = ParamsSchema.parse(input);

	const customer = await db.get("customer", validatedInput.customer_id);

	if (!customer) {
		throw new HTTPException(404, {
			message: `Customer with id: ${validatedInput.customer_id} not found`,
		});
	}

	const customersWithSubscriptionPlans = await db.getAll(
		"customerSubscriptionPlan",
	);
	const customerSubscriptionPlan = customersWithSubscriptionPlans
		.filter(
			(csp) =>
				csp.customer_id === validatedInput.customer_id &&
				csp.subscription_cancel_date === null &&
				csp.invoice_id === null,
		)
		.sort((a, b) =>
			compareDesc(
				new Date(a.subscription_start_date),
				new Date(b.subscription_start_date),
			),
		)[0];

	const subscriptionPlan = await db.get(
		"subscriptionPlan",
		customerSubscriptionPlan.subscription_plan_id,
	);

	if (!subscriptionPlan) {
		throw new HTTPException(404, {
			message: `Subscription plan with id: ${customerSubscriptionPlan.subscription_plan_id} not found`,
		});
	}

	return {
		subscriptionPlan,
		customerSubscriptionPlan,
	};
}

const CreateCustomerSubscriptionPlanInput = z.object({
	customer_id: z.string().uuid(),
	subscription_plan_id: z.string().uuid(),
});

type CreateCustomerSubscriptionPlanInputType = z.infer<
	typeof CreateCustomerSubscriptionPlanInput
>;

export async function createCustomerSubscriptionPlan({
	db,
	input,
}: {
	db: DBClient;
	input: CreateCustomerSubscriptionPlanInputType;
}) {
	const validatedInput = CreateCustomerSubscriptionPlanInput.parse(input);

	const subscriptionPlan = await db.get(
		"subscriptionPlan",
		validatedInput.subscription_plan_id,
	);

	if (!subscriptionPlan) {
		throw new HTTPException(404, {
			message: "Subscription plan not found",
		});
	}

	if (subscriptionPlan.status === "inactive") {
		throw new HTTPException(400, {
			message: "Subscription plan is inactive",
		});
	}

	const customerSubscriptionPlan = await db.insert("customerSubscriptionPlan", {
		customer_id: validatedInput.customer_id,
		subscription_plan_id: validatedInput.subscription_plan_id,
		subscription_cancel_date: null,
		subscription_start_date: formatISO(new Date(), {
			representation: "date",
		}),
		subscription_end_date: formatISO(
			subscriptionPlan.billing_cycle === "monthly"
				? addMonths(new Date(), 1)
				: addYears(new Date(), 1),
			{
				representation: "date",
			},
		),
		invoice_id: null,
	});

	return customerSubscriptionPlan;
}
