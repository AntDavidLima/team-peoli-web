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
import { api } from "@/lib/api";
import { yupResolver } from "@hookform/resolvers/yup";
import { Icon } from "@iconify-icon/react/dist/iconify.mjs";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ColumnDef } from "@tanstack/react-table";
import { useForm } from "react-hook-form";
import * as yup from "yup";

const studentSearchSchema = yup.object({
	rows: yup.number().optional(),
});

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

export const Route = createFileRoute("/_authenticated/student")({
	component: Student,
	validateSearch: (search) => studentSearchSchema.validateSync(search),
});

interface Student {
	id: number;
	name: string;
	email: string;
	phone: string;
}

const tableColumns: ColumnDef<Student>[] = [
	{
		accessorKey: "name",
		header: "Nome",
	},
	{ accessorKey: "email", header: "E-mail" },
	{
		accessorKey: "phone",
		header: "Telefone",
	},
];

function Student() {
	const queryClient = useQueryClient();

	const { data: students } = useQuery({
		queryKey: ["students"],
		queryFn: fetchStudents,
		initialData: [],
	});

	const { mutate: addStudent } = useMutation({
		mutationFn: createStudent,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["students"] });
		},
	});

	const navigate = useNavigate();

	const { rows } = Route.useSearch();

	const form = useForm<CreateStudentForm>({
		resolver: yupResolver(createStudentFormSchema),
	});

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
					/>
					<Sheet>
						<SheetTrigger>
							<Button>Cadastrar aluno</Button>
						</SheetTrigger>
						<SheetContent>
							<SheetHeader>
								<SheetTitle>Cadastrar aluno</SheetTitle>
								<SheetDescription>
									Uma senha de acesso provisória será enviada ao e-mail
									cadastrado.
								</SheetDescription>
							</SheetHeader>
							<Form {...form}>
								<form
									onSubmit={form.handleSubmit(addStudent)}
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
												<FormDescription>
													E-mail que receberá a senha provisória
												</FormDescription>
												<FormMessage />
											</FormItem>
										)}
									/>
									<FormField
										control={form.control}
										name="phone"
										render={({ field }) => (
											<FormItem>
												<FormLabel>Telefone</FormLabel>
												<FormControl>
													<Input placeholder="(88) 8 8888-8888" {...field} />
												</FormControl>
												<FormMessage />
											</FormItem>
										)}
									/>
									<Button>Cadastrar</Button>
								</form>
							</Form>
						</SheetContent>
					</Sheet>
				</div>
				<DataGrid<Student> rows={students} columns={tableColumns} />
				<div class="flex items-center p-2 border-t-muted border-t gap-4 justify-end text-sm">
					<div class="flex items-center gap-2">
						<p>Linhas por página:</p>
						<Select
							onValueChange={handleRowsPerPageChange}
							value={rows?.toString() || "10"}
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
						<Button variant="ghost" size="icon">
							<Icon icon="mingcute:left-line" height={20} width={20} />
						</Button>
						<Button variant="ghost" size="icon">
							<Icon icon="mingcute:right-line" height={20} width={20} />
						</Button>
					</div>
				</div>
			</div>
		</Page>
	);

	async function fetchStudents() {
		const { data: students } = await api.get("/user");

		return students;
	}

	function handleRowsPerPageChange(rows: string) {
		navigate({
			search: {
				rows: Number(rows),
			},
		});
	}

	async function createStudent({ phone, email, name }: CreateStudentForm) {
		await api.post("/user", {
			phone,
			email,
			name,
		});
	}
}
