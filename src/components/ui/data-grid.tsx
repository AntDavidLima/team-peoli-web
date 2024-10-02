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
		manualPagination: true,
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
			<TableBody className="relative">
				{isLoading && (
					<TableRow className="border-none -top-1 absolute w-full overflow-x-clip">
						<TableCell colSpan={columns.length} className="py-0">
							<div class="h-1 bg-background before:h-1 before:absolute before:bg-primary before:w-6/12 before:animate-slide-away" />
						</TableCell>
					</TableRow>
				)}
				{table.getRowModel().rows?.length ? (
					table.getRowModel().rows.map((row) => (
						<TableRow
							key={row.id}
							data-state={row.getIsSelected() && "selected"}
							className="border-b-muted data-[isLink=true]:cursor-pointer group"
							onClick={() => onRowClick?.(row.original)}
							data-isLink={!!onRowClick}
						>
							{row.getVisibleCells().map((cell) => (
								<TableCell key={cell.id} className="h-14 py-0">
									{flexRender(cell.column.columnDef.cell, cell.getContext())}
								</TableCell>
							))}
						</TableRow>
					))
				) : (
					<TableRow>
						<TableCell colSpan={columns.length} className="h-24 text-center">
							{isLoading ? "Carregando..." : "Sem resultados."}
						</TableCell>
					</TableRow>
				)}
			</TableBody>
		</Table>
	);
}
