import app from "@/routers";
import { logger } from "hono/logger";
import { prettyJSON } from "hono/pretty-json";
import type { Env } from "./lib/app";
import { retryFailedPayments } from "./cron/retry-failed-payments";
import { generateInvoices } from "./cron/generate-invoices";

app.use(prettyJSON(), logger());

export default {
	fetch: app.fetch,
	async scheduled(controller: ScheduledEvent, env: Env, ctx: ExecutionContext) {
		// Write code for updating your API
		switch (controller.cron) {
			// Every day at 10 am
			case "0 10 * * *":
				await generateInvoices(env);
				break;
			// Every day at 11 am
			case "0 11 * * *":
				await retryFailedPayments(env);
				break;
		}
		console.log("cron processed");
	},
};
