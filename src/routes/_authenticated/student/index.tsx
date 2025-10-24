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
    queryKey: ["students", page, rows, query, activeFilter],
    queryFn: () => fetchStudents({ rows, page, query, status: activeFilter }),
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
          page: 1,
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
      edittingStudentId.value = null;
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
        <div className="flex flex-col">
          <span>{row.original.email}</span>
          <span className="text-xs text-muted-foreground">
            {phone.mask(row.original.phone)}
          </span>
        </div>
      ),
    },
    {
      accessorKey: "status",
      header: "STATUS",
      cell: ({ row }) => row.original.isActive ? 'Ativo': 'Inativo',
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <div className="invisible group-hover:visible text-right space-x-1">
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
            <AlertDialogTrigger asChild>
              <Button size="icon" variant="ghost" onClick={(e) => e.stopPropagation()}>
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
    navigate({
      search: (prev) => ({ ...prev, page: 1 }),
    });
  };

  return (
    <Page title="Alunos" description="Cadastre, edite e acompanhe seus alunos">
      <Button
        className="float-right -mt-10"
        onClick={() => (isCreationFormOpen.value = true)}
      >
        Cadastrar Aluno
      </Button>
        <div className="py-6 flex items-center justify-between gap-2">
          <label className="sr-only" htmlFor="search">
            Buscar aluno
          </label>
          <Input
            id="search"
            placeholder="Buscar aluno por nome ou e-mail..."
            className="w-[80%] h-12 bg-card border border-[0.5px] rounded-lg p-2 outline-none focus:border-primary"
            onChange={handleQueryChange}
            defaultValue={query}
          />
          <div className="bg-card border-[0.5px] border p-1 rounded-lg flex items-center gap-2">
            {["Todos", "Ativo", "Finalizado", "Inativo"].map((filter) => ( // Ajustado para filtros de status
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
        
        <Sheet
          open={isCreationFormOpen.value}
          onOpenChange={(open) => {
            isCreationFormOpen.value = open;
            if (!open) {
              setTimeout(() => {
                form.reset({ name: '', email: '', phone: '', isActive: true });
                edittingStudentId.value = null;
              }, 300);
            }
          }}
        >
          <SheetContent className="overflow-y-auto">
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
                className="space-y-6"
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
                          value={phone.mask(value || "")}
                          onChange={(event) => {
                            const unmaskedValue = phone.unmask(event.currentTarget.value);
                            onChange(unmaskedValue);
                          }}
                          type="tel"
                          maxLength={15}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Acesso</FormLabel>
                      <Select
                        onValueChange={(value) => field.onChange(value === 'true')}
                        value={String(field.value)}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Altere o acesso do aluno" />
                          </SelectTrigger>
                        </FormControl>
                          <SelectContent>
                            <SelectItem value="true">Ativo</SelectItem>
                            <SelectItem value="false">Inativo</SelectItem>
                          </SelectContent>
                      </Select>
                      <FormDescription>
                        Altera o acesso do aluno. Se inativo, o aluno não poderá acessar o sistema.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit">
                  {edittingStudentId.value ? "Salvar" : "Cadastrar"}
                </Button>
              </form>
            </Form>
          </SheetContent>
        </Sheet>
      <div className="bg-card rounded-lg mt-8">
        <DataGrid<Student>
          rows={students}
          columns={tableColumns}
          onRowClick={handleTableRowClick}
          isLoading={loadingStudents || sendingWelcomeMail}
        />
        <div className="flex items-center p-2 border-t-muted border-t gap-4 justify-end text-sm">
          <div className="flex items-center gap-2">
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
            {`${(page - 1) * rows + 1}-${Math.min(page * rows, totalStudents)} de ${totalStudents}`}
          </p>
          <div className="flex items-center">
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

  async function fetchStudents({ query, rows, page, status }: StudentSearch & { status: string }) {
    const params: Record<string, any> = { query, rows, page };
    if (status && status !== 'Todos') {
      params.isActive = status === 'Ativo';
    }
    const { data } = await api.get("/user", { params });
    return data;
  }

  function handleRowsPerPageChange(rows: string) {
    navigate({
      search: (previousSearch) => ({
        ...previousSearch,
        rows: Number(rows),
        page: 1,
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