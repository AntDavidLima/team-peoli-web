import { isAuthenticated } from "@/signals/authentication";
import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  beforeLoad: () => {
    if (isAuthenticated.value) {
      throw redirect({
        to: "/student",
      });
    } else {
      throw redirect({
        to: "/login",
      });
    }
  },
});
