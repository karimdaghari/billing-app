import { InvoiceInput, type InvoiceSchema } from "@/db/models/invoice";
import { getBillingCycleEndDate } from "@/services/billing";
import { HTTPException } from "hono/http-exception";
import type { AppContext } from "@/lib/app";
import { z } from "@hono/zod-openapi";
import { getCustomerSubscriptionPlanByCustomerId } from "@/routers/customer/lib";

const Input = InvoiceInput.extend({
	proratedAmount: z.number().optional(),
});
type Input = z.infer<typeof Input>;

interface CreateInvoiceParams {
	ctx: AppContext;
	input: Input;
}

export async function generateInvoice({
	ctx,
	input,
}: CreateInvoiceParams): Promise<InvoiceSchema | undefined> {
	const { customer_id, proratedAmount } = Input.parse(input);

	const today = new Date();

	const allInvoices = await ctx.var.db.getAll("invoice");

	const subscriptionPlan = await getCustomerSubscriptionPlanByCustomerId({
		db: ctx.var.db,
		input: {
			customer_id: customer_id,
		},
	});

	const billingCycle = subscriptionPlan.billing_cycle;
	const amount = proratedAmount ?? subscriptionPlan.price;

	if (amount === 0) {
		// If the amount is 0, we don't need to generate an invoice
		return;
	}

	const dueDate = getBillingCycleEndDate(today, billingCycle);

	// Check if an invoice already exists for this customer in the current billing cycle
	const existingInvoice = allInvoices.find(
		(invoice) =>
			invoice.customer_id === customer_id &&
			invoice.due_date === dueDate &&
			(invoice.payment_status === "pending" ||
				invoice.payment_status === "failed"),
	);

	if (existingInvoice) {
		return existingInvoice;
	}

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
		throw new HTTPException(500, {
			message: `Failed to get customer: ${customer_id}`,
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
