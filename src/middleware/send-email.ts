import type { AppEnv } from "@/lib/app";
import { type EmailParams, sendEmail } from "@/services/email";
import { createMiddleware } from "hono/factory";

export const sendEmailMiddleware = createMiddleware<AppEnv>(async (c, next) => {
	c.set("sendEmail", (params: Omit<EmailParams, "config">) =>
		sendEmail({
			...params,
			config: {
				API_KEY: c.env.SENDGRID_API_KEY,
				FROM_EMAIL_ADDRESS: c.env.FROM_EMAIL_ADDRESS,
			},
		}),
	);
	await next();
});
