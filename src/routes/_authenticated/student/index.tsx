import { Button } from "@/components/ui/button";
import { DataGrid } from "@/components/ui/data-grid";
import {
	Form,
	FormControl,
	FormDescription,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Page } from "@/components/ui/page";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from "@/components/ui/sheet";
import { APIError, api } from "@/lib/api";
import { yupResolver } from "@hookform/resolvers/yup";
import {
	keepPreviousData,
	useMutation,
	useQuery,
	useQueryClient,
} from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ColumnDef } from "@tanstack/react-table";
import { TargetedEvent } from "react";
import { useForm } from "react-hook-form";
import * as yup from "yup";
import _ from "lodash";
import { signal } from "@preact/signals";
import { AxiosError } from "axios";
import { toast } from "@/components/ui/use-toast";
import { phone } from "@/lib/masks";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ChevronLeft, ChevronRight, Pencil, Trash2 } from "lucide-react";

const studentSearchSchema = yup.object({
	rows: yup.number().optional().default(10),
	page: yup.number().optional().default(1),
	query: yup.string().optional().default(""),
});

type StudentSearch = yup.InferType<typeof studentSearchSchema>;

const createStudentFormSchema = yup.object({
	name: yup.string().required("Campo obrigatório"),
	email: yup.string().email("E-mail inválido").required("Campo obrigatório"),
	phone: yup
		.string()
		.matches(/^\d{11}$/, { message: "Telefone inválido" })
		.length(11, { message: "O telefone deve possuir 11 dígitos" })
		.required("Campo obrigatório"),
});

type CreateStudentForm = yup.InferType<typeof createStudentFormSchema>;

type UpdateStudentForm = CreateStudentForm;

export const Route = createFileRoute("/_authenticated/student/")({
	component: StudentsList,
	validateSearch: (search) => studentSearchSchema.validateSync(search),
});

export interface Student {
	id: number;
	name: string;
	email: string;
	phone: string;
}

const isCreationFormOpen = signal(false);
const edittingStudentId = signal<number | null>(null);

function StudentsList() {
	const queryClient = useQueryClient();

	const { rows, page, query } = Route.useSearch();

	const {
		data: [totalStudents, students],
		isFetching: loadingStudents,
	} = useQuery({
		queryKey: ["students", page, rows, query],
		queryFn: () => fetchStudents({ rows, page, query }),
		initialData: [0, []],
		placeholderData: keepPreviousData,
	});

	const navigate = useNavigate();

	const debouncedSearchStudent = _.debounce((query: string) => {
		navigate({
			search: (previousSearch) => ({
				...previousSearch,
				query,
			}),
		});
	}, 300);

	const form = useForm<CreateStudentForm>({
		resolver: yupResolver(createStudentFormSchema),
	});

	const { mutate: addStudent } = useMutation({
		mutationFn: createStudent,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["students"] });
			isCreationFormOpen.value = false;
			form.reset();
		},
		onError: (error) => {
			if (error instanceof AxiosError) {
				const apiError = error.response?.data as APIError;

				if (typeof apiError.error === "string") {
					toast({
						title: apiError.message,
						variant: "destructive",
					});
				}
			}
		},
	});

	const { mutate: removeStudent } = useMutation({
		mutationFn: deleteStudent,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["students"] });
		},
		onError: (error) => {
			if (error instanceof AxiosError) {
				const apiError = error.response?.data as APIError;

				if (typeof apiError.error === "string") {
					toast({
						title: apiError.message,
						variant: "destructive",
					});
				}
			}
		},
	});

	const { mutate: patchStudent } = useMutation({
		mutationFn: updateStudent,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["students"] });
			isCreationFormOpen.value = false;
			form.reset();
		},
		onError: (error) => {
			if (error instanceof AxiosError) {
				const apiError = error.response?.data as APIError;

				if (typeof apiError.error === "string") {
					toast({
						title: apiError.message,
						variant: "destructive",
					});
				}
			}
		},
	});

	const tableColumns: ColumnDef<Student>[] = [
		{
			accessorKey: "name",
			header: "Nome",
		},
		{ accessorKey: "email", header: "E-mail" },
		{
			accessorKey: "phone",
			header: "Telefone",
			cell: ({ row }) => phone.mask(row.original.phone),
		},
		{
			id: "actions",
			cell: ({ row }) => (
				<div class="invisible group-hover:visible text-right space-x-1">
					<Button
						size="icon"
						variant="ghost"
						onClick={(e) => {
							e.stopPropagation();
							edittingStudentId.value = row.original.id;
							Object.entries(row.original).forEach(([key, value]) => {
								form.setValue(key as keyof CreateStudentForm, value);
							});
							isCreationFormOpen.value = true;
						}}
					>
						<Pencil size={14} />
					</Button>
					<AlertDialog>
						<AlertDialogTrigger onClick={(e) => e.stopPropagation()}>
							<Button size="icon" variant="ghost">
								<Trash2 size={14} />
							</Button>
						</AlertDialogTrigger>
						<AlertDialogContent>
							<AlertDialogHeader>
								<AlertDialogTitle>Remover aluno</AlertDialogTitle>
								<AlertDialogDescription>
									Tem certeza que deseja remover este aluno?
								</AlertDialogDescription>
							</AlertDialogHeader>
							<AlertDialogFooter>
								<AlertDialogCancel>Cancelar</AlertDialogCancel>
								<AlertDialogAction
									className="bg-destructive hover:bg-destructive/80"
									onClick={() => removeStudent(row.original.id)}
								>
									Deletar
								</AlertDialogAction>
							</AlertDialogFooter>
						</AlertDialogContent>
					</AlertDialog>
				</div>
			),
		},
	];

	return (
		<Page title="Alunos" description="Cadastre, edite e remova alunos">
			<div class="bg-card rounded mt-8">
				<div class="p-6 flex items-center justify-between">
					<label class="sr-only" for="search">
						Buscar aluno
					</label>
					<input
						id="search"
						placeholder="Buscar aluno..."
						class="bg-transparent border-muted border-2 rounded p-2 outline-none focus:border-primary"
						onChange={handleQueryChange}
						value={query}
					/>
					<Sheet
						open={isCreationFormOpen.value}
						onOpenChange={(open) => {
							isCreationFormOpen.value = open;
							edittingStudentId.value && setTimeout(() => form.reset(), 500);
							edittingStudentId.value = null;
						}}
					>
						<SheetTrigger asChild>
							<Button>Cadastrar aluno</Button>
						</SheetTrigger>
						<SheetContent>
							<SheetHeader className="mb-4">
								<SheetTitle>
									{edittingStudentId.value ? "Editar aluno" : "Cadastrar aluno"}
								</SheetTitle>
								{!edittingStudentId.value && (
									<SheetDescription>
										Uma senha de acesso provisória será enviada ao e-mail
										cadastrado.
									</SheetDescription>
								)}
							</SheetHeader>
							<Form {...form}>
								<form
									onSubmit={form.handleSubmit(
										edittingStudentId.value ? patchStudent : addStudent,
									)}
									class="space-y-6"
								>
									<FormField
										control={form.control}
										name="name"
										render={({ field }) => (
											<FormItem>
												<FormLabel>Nome</FormLabel>
												<FormControl>
													<Input placeholder="Nome do aluno" {...field} />
												</FormControl>
												<FormMessage />
											</FormItem>
										)}
									/>
									<FormField
										control={form.control}
										name="email"
										render={({ field }) => (
											<FormItem>
												<FormLabel>E-mail</FormLabel>
												<FormControl>
													<Input placeholder="email@exemplo.com" {...field} />
												</FormControl>
												{!edittingStudentId.value && (
													<FormDescription>
														E-mail que receberá a senha provisória
													</FormDescription>
												)}
												<FormMessage />
											</FormItem>
										)}
									/>
									<FormField
										control={form.control}
										name="phone"
										render={({ field: { value, onChange, ...field } }) => (
											<FormItem>
												<FormLabel>Telefone</FormLabel>
												<FormControl>
													<Input
														placeholder="(99) 99999-9999"
														{...field}
														value={phone.mask(value)}
														onChange={(event) => {
															event.currentTarget.value = phone.unmask(
																event.currentTarget.value,
															);
															onChange(event);
														}}
														type="tel"
													/>
												</FormControl>
												<FormMessage />
											</FormItem>
										)}
									/>
									<Button>
										{edittingStudentId.value ? "Salvar" : "Cadastrar"}
									</Button>
								</form>
							</Form>
						</SheetContent>
					</Sheet>
				</div>
				<DataGrid<Student>
					rows={students}
					columns={tableColumns}
					onRowClick={handleTableRowClick}
					isLoading={loadingStudents}
				/>
				<div class="flex items-center p-2 border-t-muted border-t gap-4 justify-end text-sm">
					<div class="flex items-center gap-2">
						<p>Linhas por página:</p>
						<Select
							onValueChange={handleRowsPerPageChange}
							value={rows.toString()}
						>
							<SelectTrigger>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="10">10</SelectItem>
								<SelectItem value="25">25</SelectItem>
								<SelectItem value="100">100</SelectItem>
							</SelectContent>
						</Select>
					</div>
					<p>1-10 de 10</p>
					<div class="flex items-center">
						<Button
							variant="ghost"
							size="icon"
							onClick={handlePreviousPageClick}
							disabled={page === 1}
						>
							<ChevronLeft size={20} />
						</Button>
						<Button
							variant="ghost"
							size="icon"
							onClick={handleNextPageClick}
							disabled={page * rows >= totalStudents}
						>
							<ChevronRight size={20} />
						</Button>
					</div>
				</div>
			</div>
		</Page>
	);

	async function handleTableRowClick(student: Student) {
		navigate({
			to: "/student/$id",
			params: {
				id: student.id.toString(),
			},
		});
	}

	async function fetchStudents({ query, rows, page }: StudentSearch) {
		const { data: students } = await api.get("/user", {
			params: {
				query,
				rows,
				page,
			},
		});

		return students;
	}

	function handleRowsPerPageChange(rows: string) {
		navigate({
			search: (previousSearch) => ({
				...previousSearch,
				rows: Number(rows),
			}),
		});
	}

	function handleQueryChange(event: TargetedEvent<HTMLInputElement>) {
		debouncedSearchStudent(event.currentTarget.value);
	}

	function handleNextPageClick() {
		navigate({
			search: (previousSearch) => ({
				...previousSearch,
				page: page + 1,
			}),
		});
	}

	function handlePreviousPageClick() {
		navigate({
			search: (previousSearch) => ({
				...previousSearch,
				page: page - 1,
			}),
		});
	}

	async function createStudent({ phone, email, name }: CreateStudentForm) {
		await api.post("/user", {
			phone,
			email,
			name,
		});
	}

	async function deleteStudent(id: number) {
		await api.delete(`/user/${id}`);
	}

	async function updateStudent({ phone, email, name }: UpdateStudentForm) {
		await api.patch(`/user/${edittingStudentId.value}`, {
			phone,
			email,
			name,
		});
	}
}
