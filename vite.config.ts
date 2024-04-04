import { defineConfig } from "vite";
import preact from "@preact/preset-vite";
import { TanStackRouterVite } from "@tanstack/router-vite-plugin";

// https://vitejs.dev/config/
export default defineConfig({
	plugins: [preact(), TanStackRouterVite()],
});
