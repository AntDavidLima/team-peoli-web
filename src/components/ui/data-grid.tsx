import {
	ColumnDef,
	flexRender,
	getCoreRowModel,
	getPaginationRowModel,
	useReactTable,
} from "@tanstack/react-table";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "./table";

interface DataGrid<T> {
	rows: T[];
	columns: ColumnDef<T>[];
}

export function DataGrid<T>({ rows, columns }: DataGrid<T>) {
	const table = useReactTable({
		data: rows,
		columns,
		getCoreRowModel: getCoreRowModel(),
		getPaginationRowModel: getPaginationRowModel(),
	});

	return (
		<Table>
			<TableHeader className="border-x-card border-x-4">
				{table.getHeaderGroups().map((group) => (
					<TableRow
						key={group.id}
						className="border-none hover:bg-background bg-background"
					>
						{group.headers.map((header) => (
							<TableHead
								key={header.id}
								className="text-white font-bold uppercase"
							>
								{!header.isPlaceholder &&
									flexRender(
										header.column.columnDef.header,
										header.getContext(),
									)}
							</TableHead>
						))}
					</TableRow>
				))}
			</TableHeader>
			<TableBody>
				{table.getRowModel().rows?.length ? (
					table.getRowModel().rows.map((row) => (
						<TableRow
							key={row.id}
							data-state={row.getIsSelected() && "selected"}
							className="border-b-muted"
						>
							{row.getVisibleCells().map((cell) => (
								<TableCell key={cell.id}>
									{flexRender(cell.column.columnDef.cell, cell.getContext())}
								</TableCell>
							))}
						</TableRow>
					))
				) : (
					<TableRow>
						<TableCell colSpan={columns.length} className="h-24 text-center">
							Sem resultados.
						</TableCell>
					</TableRow>
				)}
			</TableBody>
		</Table>
	);
}
