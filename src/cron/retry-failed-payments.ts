import type { HonoContext } from "@/lib/app";
import { processPayment } from "@/services/payment";

export async function retryFailedPayments(c: HonoContext) {
	const [allInvoices, allPayments] = await Promise.all([
		c.var.db.getAll("invoice"),
		c.var.db.getAll("payment"),
	]);
	const failedInvoices = allInvoices.filter(
		(invoice) => invoice.payment_status === "failed",
	);
	const failedPayments = allPayments.filter((payment) =>
		failedInvoices.some((invoice) => invoice.id === payment.invoice_id),
	);

	const promises = failedPayments.map((payment) =>
		processPayment({ ctx: c, input: { id: payment.id } }),
	);

	await Promise.all(promises);
}
