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
	onRowClick?: (row: T) => void;
	isLoading?: boolean;
}

export function DataGrid<T>({
	rows,
	columns,
	onRowClick,
	isLoading,
}: DataGrid<T>) {
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
				{isLoading ? (
					<TableRow className="border-none">
						<TableCell colSpan={columns.length} className="py-0 px-0.5">
							<div class="h-1 bg-secondary relative overflow-hidden brefore:block before:content-[''] before:absolute before:h-1 before:bg-primary before:w-6/12 before:top-0 before:left-0 before:animate-slide-away" />
						</TableCell>
					</TableRow>
				) : (
					<TableRow className="border-none">
						<TableCell colSpan={columns.length} className="py-0 px-0.5">
							<div class="h-1 bg-background" />
						</TableCell>
					</TableRow>
				)}
				{table.getRowModel().rows?.length || isLoading ? (
					table.getRowModel().rows.map((row) => (
						<TableRow
							key={row.id}
							data-state={row.getIsSelected() && "selected"}
							className="border-b-muted data-[isLink=true]:cursor-pointer"
							onClick={() => onRowClick?.(row.original)}
							data-isLink={!!onRowClick}
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
