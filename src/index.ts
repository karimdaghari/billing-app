import app from "@/routers";
import { logger } from "hono/logger";
import { prettyJSON } from "hono/pretty-json";

app.use(prettyJSON(), logger());

export default app;
