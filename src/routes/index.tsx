import { isAuthenticated } from "@/signals/authentication";
import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
	beforeLoad: () => {
		if (isAuthenticated.value) {
			throw redirect({
				to: "/student",
				search: {
					page: 1,
					rows: 10,
					query: "",
				},
			});
		} else {
			throw redirect({
				to: "/login",
			});
		}
	},
});
