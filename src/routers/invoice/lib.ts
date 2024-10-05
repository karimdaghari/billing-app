import { InvoiceInput, type InvoiceSchema } from "@/db/models/invoice";
import {
	calculateProratedCharge,
	getBillingCycleEndDate,
} from "@/services/billing";
import { HTTPException } from "hono/http-exception";
import { getCustomerSubscriptionPlanByCustomerId } from "../customer/lib";
import type { HonoContext } from "@/lib/app";
import type { z } from "@hono/zod-openapi";

const Input = InvoiceInput.pick({ customer_id: true });
type Input = z.infer<typeof Input>;

interface CreateInvoiceParams {
	ctx: HonoContext;
	input: Input;
}

export async function createInvoice({
	ctx,
	input,
}: CreateInvoiceParams): Promise<InvoiceSchema> {
	const { customer_id } = Input.parse(input);

	const subscriptionPlan = await getCustomerSubscriptionPlanByCustomerId({
		db: ctx.var.db,
		input: {
			customer_id: customer_id,
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

	const id = await ctx.var.db.insert("invoice", {
		customer_id: customer_id,
		amount,
		due_date: dueDate,
		payment_status: "pending",
		invoice_status: "generated",
		payment_retry_count: 0,
	});

	const invoice = await ctx.var.db.get("invoice", id);

	if (!invoice) {
		throw new HTTPException(500, {
			message: `Failed to generate invoice for customer: ${customer_id}`,
		});
	}

	const customer = await ctx.var.db.get("customer", customer_id);

	if (!customer) {
		throw new HTTPException(404, {
			message: `Customer not found: ${customer_id}`,
		});
	}

	await ctx.var.sendEmail({
		to: customer.email,
		subject: "Invoice Generated",
		body: `Invoice generated for ${invoice.id}`,
		type: "text",
	});

	return invoice;
}
