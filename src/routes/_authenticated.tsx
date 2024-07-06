import {
	Link,
	Outlet,
	createFileRoute,
	redirect,
	LinkProps,
} from "@tanstack/react-router";
import { isAuthenticated } from "../signals/authentication";
import { signal } from "@preact/signals";
import { ChevronsLeft, Dumbbell, GraduationCap } from "lucide-react";

export const Route = createFileRoute("/_authenticated")({
	beforeLoad: ({ location }) => {
		if (!isAuthenticated.value) {
			throw redirect({
				to: "/login",
				search: {
					redirect: location.href,
				},
			});
		}
	},
	component: AuthenticatedLayout,
});

const expanded = signal(true);

function AuthenticatedLayout() {
	return (
		<div class="flex h-screen">
			<aside
				class="relative h-full bg-card pt-6 px-4 data-[expanded=false]:px-1.5 data-[expanded=false]:hover:w-36 data-[expanded=false]:w-16 transition-all group w-72"
				data-expanded={expanded.value}
			>
				<div class="flex items-center justify-center w-full">
					<img
						src={
							expanded.value
								? "/assets/logo-horizontal.svg"
								: "/assets/logo-without-text.svg"
						}
						class={expanded.value ? "w-32" : "w-12"}
					/>
					<button
						class="flex items-center justify-center rounded-full transition-all data-[expanded=false]:rotate-180 data-[expanded=false]:hidden group-hover:data-[expanded=false]:flex absolute right-1 hover:bg-white/10 p-2"
						onClick={() => (expanded.value = !expanded.value)}
						data-expanded={expanded.value}
					>
						<ChevronsLeft />
					</button>
				</div>
				<ul class="mt-12">
					<MenuItem
						to="/student"
						title="Alunos"
						icon={<GraduationCap size={20} />}
					/>
					<MenuItem
						to="/exercise"
						title="Exercícios"
						icon={<Dumbbell size={20} />}
					/>
				</ul>
			</aside>
			<main class="container mx-auto py-12 overflow-y-scroll">
				<Outlet />
			</main>
		</div>
	);
}

interface MenuItemProps {
	title: string;
	icon: JSX.Element;
}

function MenuItem({ to, icon, title }: MenuItemProps & Pick<LinkProps, "to">) {
	return (
		<Link to={to as string}>
			{({ isActive }) => (
				<li
					class="flex items-center gap-2 data-[active=true]:bg-primary rounded p-4 font-bold"
					data-expanded={expanded.value}
					data-active={isActive}
				>
					{icon}
					<p
						data-expanded={expanded.value}
						class="data-[expanded=false]:hidden data-[expanded=false]:group-hover:inline truncate"
					>
						{title}
					</p>
				</li>
			)}
		</Link>
	);
}
