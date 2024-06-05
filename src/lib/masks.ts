export const phone = {
	mask: (value: string | undefined) =>
		value
			?.replace(/\D/g, "")
			.replace(/(\d{2})(\d)/, "($1) $2")
			.replace(/(\d{5})(\d)/, "$1-$2"),
	unmask: (value: string) => value.replace(/\D/g, ""),
};
