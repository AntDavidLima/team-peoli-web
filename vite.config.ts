import path from "node:path";
import preact from "@preact/preset-vite";
import { TanStackRouterVite } from "@tanstack/router-vite-plugin";
import { defineConfig } from "vite";
import svgr from 'vite-plugin-svgr';

// https://vitejs.dev/config/
export default defineConfig({
	plugins: [preact(), TanStackRouterVite(), svgr()],
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "./src"),
		},
	},
	define: {
		global: {},
	},
	base: "./",
});
