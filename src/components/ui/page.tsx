import { PropsWithChildren } from "preact/compat";
import { Skeleton } from "./skeleton";

interface StaticPage {
	title: string;
	description: string;
	loading?: false;
}

interface DynamicPage {
	title: string | undefined;
	description: string | undefined;
	loading: boolean;
}

type Page = StaticPage | DynamicPage;

export function Page({
	title,
	description,
	children,
	loading,
}: Page & PropsWithChildren) {
	return (
		<div>
			<h1 class="text-3xl font-bold">{loading ? <Skeleton /> : title}</h1>
			<p class="text-muted text-lg">{loading ? <Skeleton /> : description}</p>
			{children}
		</div>
	);
}
