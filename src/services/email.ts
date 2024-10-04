import sgMail, { type MailDataRequired } from "@sendgrid/mail";

/**
 * Interface for email parameters
 */
export interface EmailParams {
	to: string;
	subject: string;
	body: string;
	type: "html" | "text";
	config: {
		API_KEY: string;
		FROM_EMAIL_ADDRESS: string;
	};
}

/**
 * Sends an email using SendGrid
 * @param params - Object containing email parameters
 * @returns Promise<void>
 */
export async function sendEmail({
	to,
	subject,
	body,
	type,
	config,
}: EmailParams): Promise<void> {
	sgMail.setApiKey(config.API_KEY);

	const message = {
		to,
		from: config.FROM_EMAIL_ADDRESS,
		subject,
		// This is a workaround to make the type inference work
		[type as "html"]: body,
	} satisfies MailDataRequired;

	try {
		await sgMail.send(message);
		console.log(`Email sent successfully to ${to}`);
	} catch (error) {
		console.error("Error sending email:", error);
		throw new Error("Failed to send email");
	}
}
