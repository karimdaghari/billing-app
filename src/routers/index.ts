import { createAppInstance } from "@/lib/app";
import { apiReference } from "@scalar/hono-api-reference";
import { subscriptionPlanRouter } from "./subscription-plan";
import { customerRouter } from "./customer";
import { paymentRouter } from "./payment";
import { customerSubscriptionPlanRouter } from "./customer/subscription-plan";
import { customerInvoiceRouter } from "./customer/invoice"; // Add this import

// We're using the root path for the sake of simplicity, in a production-grade API, a specific path like `/api/v1` would be used.
const app = createAppInstance();

app
	.route("/customer", customerRouter)
	.route(
		"/customer/:customer_id/subscription-plan",
		customerSubscriptionPlanRouter,
	)
	.route("/customer/:customer_id/invoices", customerInvoiceRouter)
	.route("/subscription-plan", subscriptionPlanRouter)
	.route("/payment", paymentRouter);

app
	.doc31("/openapi.json", (c) => ({
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
	}))
	.get(
		"/docs",
		apiReference({
			spec: {
				url: "/openapi.json",
			},
			pageTitle: "Billing API OpenAPI 3.1 Spec",
			hideDownloadButton: true,
		}),
	);

export default app;
