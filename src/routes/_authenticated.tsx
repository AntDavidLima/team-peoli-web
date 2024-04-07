import { createFileRoute, redirect } from "@tanstack/react-router";
import { isAuthenticated } from "../signals/authentication";

export const Route = createFileRoute("/_authenticated")({
	beforeLoad: () => {
		if (!isAuthenticated.value) {
			throw redirect({
				to: "/login",
			});
		}
	},
});
