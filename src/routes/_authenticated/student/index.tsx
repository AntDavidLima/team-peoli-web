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
import { TargetedEvent, useState } from "react";
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
import { ChevronLeft, ChevronRight, Mail, Pencil, Trash2 } from "lucide-react";
import { useCallback } from "react";

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
  isActive: yup.boolean(),
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
  lastPasswordChange: Date;
  isActive: boolean;
}

const isCreationFormOpen = signal(false);
const edittingStudentId = signal<number | null>(null);

function StudentsList() {
  const queryClient = useQueryClient();

  const { rows, page, query } = Route.useSearch();
    const [activeFilter, setActiveFilter] = useState("Todos");

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

  const debouncedSearchStudent = useCallback(
    _.debounce((query: string) => {
      navigate({
        search: (previousSearch) => ({
          ...previousSearch,
          query,
        }),
      });
    }, 300),
    [],
  );

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

  const { mutate: sendWelcomeMail, isPending: sendingWelcomeMail } =
    useMutation({
      mutationFn: sendMail,
      onSuccess: () => {
        toast({
          title: "E-mail de boas-vindas enviado com sucesso!",
          variant: "success",
        });
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
      header: "ALUNO",
    },
    { accessorKey: "email",
      header: "CONTATO",
      cell: ({ row }) => (
        <div class="flex flex-col">
          <span>{row.original.email}</span>
          <span class="text-xs text-muted-foreground">
            {phone.mask(row.original.phone)}
          </span>
        </div>
      ),
    },
    {
      accessorKey: "phone",
      header: "Telefone",
      cell: ({ row }) => phone.mask(row.original.phone),
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <div class="invisible group-hover:visible text-right space-x-1">
          {!row.original.lastPasswordChange && (
            <Button
              size="icon"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                sendWelcomeMail(row.original.id);
              }}
              disabled={sendingWelcomeMail}
            >
              <Mail size={14} />
            </Button>
          )}
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

  const handleFilterClick = (filter: string) => {
    setActiveFilter(filter);
  };

  return (
    <Page title="Alunos" description="Cadastre, edite e acompanhe seus alunos">
      <button class="h-10 w-52 bg-primary rounded-lg text-bold float-right -mt-10">Cadastrar Aluno</button>
        <div class="py-6 flex items-center justify-between gap-2">
          <label class="sr-only" for="search">
            Buscar aluno
          </label>
          <input
            id="search"
            placeholder="Buscar aluno por nome ou e-mail..."
            class="w-[80%] h-12 bg-card border border-[0.5px] rounded-lg p-2 outline-none focus:border-primary"
            onChange={handleQueryChange}
            defaultValue={query}
          />
          <div class="bg-card border-[0.5px] border p-1 rounded-lg flex items-center gap-2">
            {["Todos", "Em dia", "Atrasado", "Encerrado"].map((filter) => (
              <Button
                key={filter}
                variant={activeFilter === filter ? "default" : "ghost"}
                onClick={() => handleFilterClick(filter)}
              >
                {filter}
              </Button>
            ))}
          </div>
          
        </div>
      <div class="bg-card rounded-lg mt-8">
        <DataGrid<Student>
          rows={students}
          columns={tableColumns}
          onRowClick={handleTableRowClick}
          isLoading={loadingStudents || sendingWelcomeMail}
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
          <p>
            {page}-{page * rows} de {totalStudents}
          </p>
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

  async function updateStudent({ phone, email, name, isActive }: UpdateStudentForm) {
    await api.patch(`/user/${edittingStudentId.value}`, {
      phone,
      email,
      name,
      isActive
    });
  }

  async function sendMail(id: number) {
    await api.post(`/user/${id}/welcome-mail`);
  }
}
