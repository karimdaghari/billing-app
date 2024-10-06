import { KVDB } from "@/db/client";
import type { AppContext, Env } from "@/lib/app";
import { sendEmail } from "@/services/email";
import { processPayment } from "@/services/payment";

export async function retryFailedPayments(env: Env) {
	const db = new KVDB(env.DATA_STORE);
	const handleSendEmail: AppContext["var"]["sendEmail"] = (params) =>
		sendEmail({
			...params,
			config: {
				API_KEY: env.SENDGRID_API_KEY,
				FROM_EMAIL_ADDRESS: env.FROM_EMAIL_ADDRESS,
			},
		});

	const [allInvoices, allPayments] = await Promise.all([
		db.getAll("invoice"),
		db.getAll("payment"),
	]);
	const failedInvoices = allInvoices.filter(
		(invoice) => invoice.payment_status === "failed",
	);

	if (failedInvoices.length === 0) {
		return;
	}

	const failedPayments = allPayments.filter((payment) =>
		failedInvoices.some((invoice) => invoice.id === payment.invoice_id),
	);

	if (failedPayments.length === 0) {
		return;
	}

	const promises = failedPayments.map((payment) =>
		processPayment({
			db,
			sendEmail: handleSendEmail,
			input: { id: payment.id },
		}),
	);

	await Promise.all(promises);
}
