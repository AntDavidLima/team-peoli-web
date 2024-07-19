import { Toaster } from "@/components/ui/toaster";
import { createRootRoute, Outlet } from "@tanstack/react-router";

export const Route = createRootRoute({
	component: () => (
		<>
			<Outlet />
			<Toaster />
		</>
	),
});
