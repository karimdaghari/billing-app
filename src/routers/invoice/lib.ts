import type { DBClient } from "@/db/client";
import type { InvoiceSchema } from "@/db/schema";
import {
	calculateProratedCharge,
	getBillingCycleEndDate,
} from "@/services/billing";
import { HTTPException } from "hono/http-exception";
import { getCustomerSubscriptionPlanByCustomerId } from "../customer/lib";

export async function createInvoice(
	db: DBClient,
	customerId: string,
): Promise<InvoiceSchema> {
	const subscriptionPlan = await getCustomerSubscriptionPlanByCustomerId({
		db,
		input: {
			customer_id: customerId,
		},
	});

	const billingCycle = subscriptionPlan.billing_cycle;
	const price = subscriptionPlan.price;

	const today = new Date();

	const dueDate = getBillingCycleEndDate(today, billingCycle).toISOString();
	const proratedAmount = calculateProratedCharge({
		billing_cycle: billingCycle,
		fullBillingAmount: price,
		changeDate: today,
	});

	const amount = Number(proratedAmount.toFixed(3));

	const id = await db.insert("invoice", {
		customer_id: customerId,
		amount,
		due_date: dueDate,
		payment_status: "pending",
		invoice_status: "generated",
	});

	const invoice = await db.get("invoice", id);

	if (!invoice) {
		throw new HTTPException(500, {
			message: `Failed to generate invoice for customer: ${customerId}`,
		});
	}

	return invoice;
}
