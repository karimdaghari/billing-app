import { KVDB } from "@/db/client";
import type { CustomerSubscriptionPlanSchema } from "@/db/models/customer-subscription-plan";
import type { SubscriptionPlanSchema } from "@/db/models/subscription-plan";
import type { AppContext, Env } from "@/lib/app";
import { calculateProratedAmount } from "@/services/billing";
import { sendEmail } from "@/services/email";
import { compareAsc, format, isBefore, isSameDay } from "date-fns";

/**
 * Generates invoices for all customers with subscription plans that don't have invoices yet.
 * This function is typically run on a schedule to create invoices for subscriptions that are ending or have ended.
 *
 * @param {GenerateInvoicesParams} params - The parameters for generating invoices.
 * @param {AppContext} params.ctx - The application context, which includes database access.
 * @returns {Promise<void>} A promise that resolves when all invoices have been generated.
 */
export async function generateInvoices(env: Env): Promise<void> {
	const db = new KVDB(env.DATA_STORE);
	const handleSendEmail: AppContext["var"]["sendEmail"] = (input) =>
		sendEmail({
			...input,
			config: {
				API_KEY: env.SENDGRID_API_KEY,
				FROM_EMAIL_ADDRESS: env.FROM_EMAIL_ADDRESS,
			},
		});

	// Fetch all customer subscription plans
	const allCustomersSubscriptionPlans = await db.getAll(
		"customerSubscriptionPlan",
	);

	// Filter subscription plans without invoices and those that are due for invoicing
	const allCustomersSubscriptionPlansWithoutInvoices =
		allCustomersSubscriptionPlans
			.filter((csp) => csp.invoice_id === null)
			.filter(
				(csp) =>
					isSameDay(csp.subscription_end_date, new Date()) ||
					// This is just in case a past invoice hasn't been generated
					isBefore(csp.subscription_end_date, new Date()),
			);

	// If no invoices need to be generated, exit early
	if (!allCustomersSubscriptionPlansWithoutInvoices.length) {
		return;
	}

	// Group subscription plans by customer
	const allCustomersSubscriptionPlansWithoutInvoicesGroupedByCustomer =
		allCustomersSubscriptionPlansWithoutInvoices.reduce(
			(acc, csp) => {
				acc[csp.customer_id] = [...(acc[csp.customer_id] || []), csp].sort(
					(a, b) =>
						compareAsc(a.subscription_end_date, b.subscription_end_date),
				);
				return acc;
			},
			{} as Record<string, CustomerSubscriptionPlanSchema[]>,
		);

	// Get unique subscription plan IDs
	const subscriptionsPlansIds = new Set(
		Object.values(
			allCustomersSubscriptionPlansWithoutInvoicesGroupedByCustomer,
		).flatMap((csp) => csp.map((csp) => csp.subscription_plan_id)),
	);

	// Fetch all subscription plans
	const allSubscriptionPlans = await db.getAll("subscriptionPlan");

	// Filter subscription plans to only those that are needed
	const availableSubscriptionPlans = allSubscriptionPlans.filter((sp) =>
		subscriptionsPlansIds.has(sp.id),
	);

	// Generate invoices for each customer
	const invoicesPerCustomer = Object.values(
		allCustomersSubscriptionPlansWithoutInvoicesGroupedByCustomer,
	).map((csp) =>
		generateInvoiceForCustomer({
			db,
			sendEmail: handleSendEmail,
			input: {
				customerSubscriptionPlans: csp,
				subscriptionPlans: availableSubscriptionPlans,
			},
		}),
	);

	// Wait for all invoices to be generated
	await Promise.all(invoicesPerCustomer);
}

interface GenerateInvoiceForCustomerParams {
	db: AppContext["var"]["db"];
	sendEmail: AppContext["var"]["sendEmail"];
	input: {
		customerSubscriptionPlans: CustomerSubscriptionPlanSchema[];
		subscriptionPlans: SubscriptionPlanSchema[];
	};
}

/**
 * Generates an invoice for a specific customer based on their subscription plans.
 * This function calculates the amount due, creates an invoice, and sends an email to the customer.
 *
 * @param {GenerateInvoiceForCustomerParams} params - The parameters for generating an invoice for a customer.
 * @param {AppContext} params.ctx - The application context, which includes database access and email sending capability.
 * @param {Object} params.input - The input data for generating the invoice.
 * @param {CustomerSubscriptionPlanSchema[]} params.input.customerSubscriptionPlans - The customer's subscription plans.
 * @param {SubscriptionPlanSchema[]} params.input.subscriptionPlans - All available subscription plans.
 * @returns {Promise<void>} A promise that resolves when the invoice has been generated and the customer notified.
 * @throws {Error} If the customer or subscription plan is not found.
 */
async function generateInvoiceForCustomer({
	db,
	sendEmail,
	input,
}: GenerateInvoiceForCustomerParams) {
	const { customerSubscriptionPlans, subscriptionPlans } = input;

	// Get customer ID from the first subscription plan as they are all the same
	const customerId = customerSubscriptionPlans[0].customer_id;
	const customer = await db.get("customer", customerId);

	if (!customer) {
		throw new Error("Customer not found");
	}

	let dueDate: string;
	let amount = 0;

	// Handle single subscription plan case
	if (customerSubscriptionPlans.length === 1) {
		const customerSubscriptionPlan = customerSubscriptionPlans[0];
		const subscriptionPlan = subscriptionPlans.find(
			(sp) => sp.id === customerSubscriptionPlan.subscription_plan_id,
		);

		if (!subscriptionPlan) {
			throw new Error("Subscription plan not found");
		}

		dueDate = customerSubscriptionPlan.subscription_end_date;
		amount = subscriptionPlan.price;
	} else {
		// Handle multiple subscription plans case
		dueDate =
			customerSubscriptionPlans[customerSubscriptionPlans.length - 1]
				.subscription_end_date;

		// Calculate prorated amount for each plan change
		for (let i = 0; i < customerSubscriptionPlans.length - 1; i++) {
			const currentCustomerSubscriptionPlan = customerSubscriptionPlans[i];
			const currentSubscriptionPlan = subscriptionPlans.find(
				(sp) => sp.id === currentCustomerSubscriptionPlan.subscription_plan_id,
			);

			if (!currentSubscriptionPlan) {
				throw new Error("Current subscription plan not found");
			}

			const nextCustomerSubscriptionPlan = customerSubscriptionPlans[i + 1];
			const nextSubscriptionPlan = subscriptionPlans.find(
				(sp) => sp.id === nextCustomerSubscriptionPlan.subscription_plan_id,
			);

			if (!nextSubscriptionPlan) {
				throw new Error("Next subscription plan not found");
			}

			// Calculate prorated amount for the plan change
			amount += calculateProratedAmount({
				originalPlan: currentSubscriptionPlan,
				newPlan: nextSubscriptionPlan,
				changeDate: new Date(
					currentCustomerSubscriptionPlan.subscription_end_date,
				),
				startDate: new Date(
					nextCustomerSubscriptionPlan.subscription_start_date,
				),
				endDate: new Date(nextCustomerSubscriptionPlan.subscription_start_date),
			});
		}
	}

	// Create invoice and send email concurrently
	const [invoiceId] = await Promise.all([
		db.insert("invoice", {
			due_date: dueDate,
			amount: amount,
			customer_id: customerId,
			invoice_status: "generated",
			payment_status: "pending",
			payment_retry_count: 0,
		}),
		sendEmail({
			to: customer.email,
			subject: "Invoice Generated",
			body: `
				Dear ${customer.name},

				We are pleased to inform you that an invoice has been generated for your account.

				Due Date: ${format(dueDate, "PPP")}
				Amount: ${new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount)}

				Please make the payment at your earliest convenience.`,
			type: "text",
		}),
	]);

	// Update all customer subscription plans with the new invoice ID
	return await Promise.all(
		customerSubscriptionPlans.map((csp) =>
			db.update("customerSubscriptionPlan", csp.id, {
				invoice_id: invoiceId,
			}),
		),
	);
}
