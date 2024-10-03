import { defineWorkersProject } from "@cloudflare/vitest-pool-workers/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineWorkersProject(() => {
	return {
		test: {
			globals: true,
			poolOptions: {
				workers: { wrangler: { configPath: "./wrangler.toml" } },
			},
		},
		plugins: [tsconfigPaths()],
	};
});
