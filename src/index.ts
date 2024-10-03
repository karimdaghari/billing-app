import { createAppInstance } from "./lib/app";
import { apiReference } from "@scalar/hono-api-reference";
import { prettyJSON } from "hono/pretty-json";
import { subscriptionRouter } from "./routers/subscription";
import { logger } from "hono/logger";
import { customerRouter } from "./routers/customer";

const app = createAppInstance();

app.route("/customer", customerRouter);
app.route("/subscription", subscriptionRouter);

app.doc31("/openapi.json", (c) => ({
	openapi: "3.1.0",
	info: {
		title: "Billing API",
		description: "A minimal API for billing",
		version: "1",
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
