import { createAppInstance } from "./lib/app";
import { apiReference } from "@scalar/hono-api-reference";
import { prettyJSON } from "hono/pretty-json";
import { subscriptionPlanRouter } from "./routers/subscription-plan";
import { logger } from "hono/logger";
import { customerRouter } from "./routers/customer";
import { invoiceRouter } from "./routers/invoice";
import { paymentRouter } from "./routers/payment";
import { customerSubscriptionPlanRouter } from "./routers/customer/subscription-plan";
import { customerInvoicesRouter } from "./routers/customer/invoices"; // Add this import

// We're using the root path for the sake of simplicity, in a production-grade API, a specific path like `/api/v1` would be used.
const app = createAppInstance();

app.route("/customer", customerRouter);
app.route("/customer/:id/subscription-plan", customerSubscriptionPlanRouter);
app.route("/customer/:id/invoices", customerInvoicesRouter); // Add this line
app.route("/subscription-plan", subscriptionPlanRouter);
app.route("/invoice", invoiceRouter);
app.route("/payment", paymentRouter);

app.doc31("/openapi.json", (c) => ({
	openapi: "3.1.0",
	info: {
		title: "Billing API",
		description: "A minimal API for billing",
		version: "1.0",
	},
	servers: [
		{
			url: new URL(c.req.url).origin,
			description: "Current environment",
		},
	],
}));

app.get(
	"/docs",
	apiReference({
		spec: {
			url: "/openapi.json",
		},
		pageTitle: "Billing API Docs",
		hideDownloadButton: true,
	}),
);

app.use(prettyJSON(), logger());

export default app;
