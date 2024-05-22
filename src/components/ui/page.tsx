import { PropsWithChildren } from "preact/compat";

interface Page {
	title: string;
	description: string;
}

export function Page({
	title,
	description,
	children,
}: Page & PropsWithChildren) {
	return (
		<div>
			<h1 class="text-3xl font-bold">{title}</h1>
			<p class="text-muted text-lg">{description}</p>
			{children}
		</div>
	);
}
