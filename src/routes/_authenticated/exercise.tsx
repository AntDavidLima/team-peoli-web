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
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from "@/components/ui/sheet";
import { api } from "@/lib/api";
import { yupResolver } from "@hookform/resolvers/yup";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ColumnDef } from "@tanstack/react-table";
import { useForm } from "react-hook-form";
import * as yup from "yup";
import CreatableSelect from "react-select/creatable";
import { MultiValueGenericProps, OptionProps, components } from "react-select";
import {
	AlertDialogContent,
	AlertDialog,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogAction,
	AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { signal } from "@preact/signals";
import { Badge } from "@/components/ui/badge";
import { EditorState, convertToRaw } from "draft-js";
import "@/../node_modules/react-draft-wysiwyg/dist/react-draft-wysiwyg.css";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { ChevronLeft, ChevronRight, Pencil, Trash2 } from "lucide-react";

interface SelectOption {
	label: string;
	value: number;
	weight: number;
}

const focusedMuscleGroup = signal<null | SelectOption>(null);
const isDeleteMuscleGroupDialogOpen = signal(false);
const isRenameMuscleGroupDialogOpen = signal(false);
const isAddMuscleGroupDialogOpen = signal(false);
const isUpdateMuscleGroupWeightDialogOpen = signal(false);

const exerciseSearchSchema = yup.object({
	rows: yup.number().optional(),
});

export const Route = createFileRoute("/_authenticated/exercise")({
	component: Exercise,
	validateSearch: (search) => exerciseSearchSchema.validateSync(search),
});

export interface Exercise {
	id: number;
	name: string;
	restTime: number;
	muscleGroups: ExercisedMuscleGroup[];
}

interface ExercisedMuscleGroup {
	weight: number;
	muscleGroup: MuscleGroup;
}

export interface MuscleGroup {
	id: number;
	name: string;
}

const tableColumns: ColumnDef<Exercise>[] = [
	{
		accessorKey: "name",
		header: "Nome",
	},
	{ accessorKey: "restTime", header: "Tempo de descanso" },
	{
		accessorKey: "muscleGroups",
		header: "Grupos musculares",
		cell: ({ row }) => (
			<div className="space-x-1">
				{row.original.muscleGroups.map((muscleGroup) => (
					<Badge key={muscleGroup.muscleGroup.id} variant="secondary">
						{muscleGroup.muscleGroup.name} x {muscleGroup.weight}
					</Badge>
				))}
			</div>
		),
	},
];

const createExerciseFormSchema = yup.object({
	name: yup.string().required("Campo obrigatório"),
	instructions: yup.mixed<EditorState>().required(),
	restTime: yup.number().typeError("Tempo de descanso inválido"),
	muscleGroups: yup
		.array(
			yup.object({
				value: yup.number().required(),
				label: yup.string().required(),
				weight: yup.number().required(),
			}),
		)
		.min(1, "Selecione ao menos um grupo")
		.required(),
});

type CreateExerciseForm = yup.InferType<typeof createExerciseFormSchema>;

interface CreateMuscleGroupForm {
	name: string;
}

function Exercise() {
	const navigate = useNavigate();

	const { rows } = Route.useSearch();

	const form = useForm<CreateExerciseForm>({
		resolver: yupResolver(createExerciseFormSchema),
		defaultValues: {
			muscleGroups: [],
			instructions: EditorState.createEmpty(),
		},
	});

	const queryClient = useQueryClient();

	const { data: exercises } = useQuery({
		queryKey: ["exercises"],
		queryFn: fetchExercises,
		initialData: [],
	});

	const { mutate: addExercise } = useMutation({
		mutationFn: createExercise,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["exercises"] });
		},
	});

	const { data: muscleGroups, isLoading: loadingMuscleGroups } = useQuery({
		queryKey: ["exercise/muscle-groups"],
		queryFn: fetchMuscleGroups,
		initialData: [],
	});

	const { mutate: addMuscleGroup, isPending: creatingMuscleGroup } =
		useMutation({
			mutationFn: createMuscleGroup,
			onSuccess: () => {
				queryClient.invalidateQueries({ queryKey: ["exercise/muscle-groups"] });
			},
		});

	const { mutate: deleteMuscleGroup, isPending: deletingMuscleGroup } =
		useMutation({
			mutationFn: handleDeleteMuscleGroup,
			onSuccess: () => {
				queryClient.invalidateQueries({ queryKey: ["exercise/muscle-groups"] });
			},
		});

	const { mutate: updateMuscleGroup } = useMutation({
		mutationFn: handleUpdateMuscleGroup,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["exercise/muscle-groups"] });
		},
	});

	return (
		<Page title="Exercícios" description="Gerenciamento de exercícios">
			<div class="bg-card rounded mt-8">
				<div class="p-6 flex items-center justify-between">
					<label class="sr-only" for="search">
						Buscar exercício
					</label>
					<input
						id="search"
						placeholder="Buscar exercício..."
						class="bg-transparent border-muted border-2 rounded p-2 outline-none focus:border-primary"
					/>
					<AlertDialog
						open={isDeleteMuscleGroupDialogOpen.value}
						onOpenChange={() => (isDeleteMuscleGroupDialogOpen.value = false)}
					>
						<AlertDialogContent>
							<AlertDialogHeader>
								<AlertDialogTitle>Deletar grupo muscular</AlertDialogTitle>
								<AlertDialogDescription>
									Tem certeza que deseja apagar este grupo muscular?
								</AlertDialogDescription>
							</AlertDialogHeader>
							<AlertDialogFooter>
								<AlertDialogCancel>Cancelar</AlertDialogCancel>
								<AlertDialogAction
									className="bg-destructive hover:bg-destructive/80"
									onClick={() =>
										deleteMuscleGroup(focusedMuscleGroup.value!.value)
									}
								>
									Deletar
								</AlertDialogAction>
							</AlertDialogFooter>
						</AlertDialogContent>
					</AlertDialog>
					<AlertDialog
						open={isRenameMuscleGroupDialogOpen.value}
						onOpenChange={() => (isRenameMuscleGroupDialogOpen.value = false)}
					>
						<AlertDialogContent>
							<AlertDialogHeader>
								<AlertDialogTitle>Editar grupo muscular</AlertDialogTitle>
							</AlertDialogHeader>
							<Input
								value={focusedMuscleGroup.value?.label}
								onChange={(e) =>
									(focusedMuscleGroup.value!.label = e.currentTarget.value)
								}
							/>
							<AlertDialogFooter>
								<AlertDialogCancel>Cancelar</AlertDialogCancel>
								<AlertDialogAction
									onClick={() => updateMuscleGroup(focusedMuscleGroup.value!)}
								>
									Salvar
								</AlertDialogAction>
							</AlertDialogFooter>
						</AlertDialogContent>
					</AlertDialog>
					<AlertDialog
						open={isAddMuscleGroupDialogOpen.value}
						onOpenChange={() => (isAddMuscleGroupDialogOpen.value = false)}
					>
						<AlertDialogContent>
							<AlertDialogHeader>
								<AlertDialogTitle>
									Peso do exercício no grupo muscular
								</AlertDialogTitle>
								<AlertDialogDescription>
									Esse peso será utilizado no calculo de repetições e séries ao
									montar um treino
								</AlertDialogDescription>
							</AlertDialogHeader>
							<Input
								value={focusedMuscleGroup.value?.weight}
								onChange={(e) =>
								(focusedMuscleGroup.value!.weight = Number(
									e.currentTarget.value,
								))
								}
								type="number"
								step={0.25}
							/>
							<AlertDialogFooter>
								<AlertDialogCancel>Cancelar</AlertDialogCancel>
								<AlertDialogAction
									onClick={() => {
										form.setValue(
											"muscleGroups",
											[
												...form.getValues("muscleGroups"),
												focusedMuscleGroup.value!,
											],
											{ shouldTouch: true },
										);
									}}
								>
									Adicionar
								</AlertDialogAction>
							</AlertDialogFooter>
						</AlertDialogContent>
					</AlertDialog>
					<AlertDialog
						open={isUpdateMuscleGroupWeightDialogOpen.value}
						onOpenChange={() =>
							(isUpdateMuscleGroupWeightDialogOpen.value = false)
						}
					>
						<AlertDialogContent>
							<AlertDialogHeader>
								<AlertDialogTitle>Atualizar peso</AlertDialogTitle>
							</AlertDialogHeader>
							<Input
								value={focusedMuscleGroup.value?.weight}
								onChange={(e) =>
								(focusedMuscleGroup.value!.weight = Number(
									e.currentTarget.value,
								))
								}
								type="number"
								step={0.25}
							/>
							<AlertDialogFooter>
								<AlertDialogCancel>Cancelar</AlertDialogCancel>
								<AlertDialogAction
									onClick={() => {
										form.setValue(
											"muscleGroups",
											[
												...form.getValues("muscleGroups").map((muscleGroup) => {
													if (
														muscleGroup.value ===
														focusedMuscleGroup.value?.value
													) {
														return focusedMuscleGroup.value!;
													}
													return muscleGroup;
												}),
											],
											{ shouldTouch: true },
										);
									}}
								>
									Salvar
								</AlertDialogAction>
							</AlertDialogFooter>
						</AlertDialogContent>
					</AlertDialog>
					<Sheet>
						<SheetTrigger asChild>
							<Button>Criar exercício</Button>
						</SheetTrigger>
						<SheetContent>
							<SheetHeader>
								<SheetTitle>Criar exercício</SheetTitle>
							</SheetHeader>
							<Form {...form}>
								<form
									onSubmit={form.handleSubmit(addExercise)}
									class="space-y-6"
								>
									<FormField
										control={form.control}
										name="name"
										render={({ field }) => (
											<FormItem>
												<FormLabel>Nome</FormLabel>
												<FormControl>
													<Input placeholder="Nome do exercício" {...field} />
												</FormControl>
												<FormMessage />
											</FormItem>
										)}
									/>
									<FormField
										control={form.control}
										name="restTime"
										render={({ field }) => (
											<FormItem>
												<FormLabel>Descanso</FormLabel>
												<FormControl>
													<Input
														placeholder="30s"
														{...field}
														type="number"
														step={15}
													/>
												</FormControl>
												<FormMessage />
												<FormDescription>
													Tempo de descanso entre as séries em segundos
												</FormDescription>
											</FormItem>
										)}
									/>
									<FormField
										control={form.control}
										name="muscleGroups"
										render={({ field }) => (
											<FormItem>
												<FormLabel>Grupo muscular</FormLabel>
												<FormControl>
													<CreatableSelect
														isMulti
														isClearable
														options={muscleGroups}
														isLoading={
															creatingMuscleGroup ||
															loadingMuscleGroups ||
															deletingMuscleGroup
														}
														placeholder="Selecione um ou mais grupos"
														noOptionsMessage={() => "Sem opções disponíveis"}
														formatCreateLabel={(input) => `Criar "${input}"`}
														loadingMessage={() => "Carregando..."}
														onCreateOption={(inputValue) =>
															addMuscleGroup({ name: inputValue })
														}
														{...field}
														components={{
															Option: CustomOption,
															MultiValueLabel: CustomMultiValueLabel,
														}}
														styles={{
															input: (baseStyles) => ({
																...baseStyles,
																color: "#fff",
															}),
															control: (baseStyles, state) => ({
																...baseStyles,
																background: "#303030",
																borderColor: "#808080",
																":hover": {
																	borderColor: "#808080",
																},
																boxShadow: state.isFocused
																	? "0 0 0 2px #CBD5E1"
																	: "none",
															}),
															menu: (baseStyles) => ({
																...baseStyles,
																background: "#454545",
															}),
															option: (baseStyles, state) => ({
																...baseStyles,
																background: state.isFocused
																	? "#0074B8"
																	: baseStyles.background,
															}),
															multiValue: (baseStyles) => ({
																...baseStyles,
																background: "#454545",
															}),
															multiValueLabel: (baseStyles) => ({
																...baseStyles,
																color: "#fff",
															}),
															multiValueRemove: (baseStyles) => ({
																...baseStyles,
																":hover": {
																	color: "red",
																},
															}),
															clearIndicator: (baseStyles, state) => ({
																...baseStyles,
																":hover": {
																	color: state.isFocused
																		? "#fff"
																		: baseStyles[":hover"]?.color,
																},
															}),
															dropdownIndicator: (baseStyles, state) => ({
																...baseStyles,
																":hover": {
																	color: state.isFocused
																		? "#fff"
																		: baseStyles[":hover"]?.color,
																},
															}),
														}}
													/>
												</FormControl>
												<FormMessage />
												<FormDescription>
													Grupos musculares trabalhados pelo exercício
												</FormDescription>
											</FormItem>
										)}
									/>
									<FormField
										control={form.control}
										name="instructions"
										render={({ field }) => (
											<FormItem>
												<FormLabel>Instruções</FormLabel>
												<FormControl>
													<RichTextEditor {...field} />
												</FormControl>
												<FormMessage />
												<FormDescription>
													Instruções gerais do exercício
												</FormDescription>
											</FormItem>
										)}
									/>
									<Button>Criar</Button>
								</form>
							</Form>
						</SheetContent>
					</Sheet>
				</div>
				<DataGrid<Exercise> rows={exercises} columns={tableColumns} />
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
							<ChevronLeft size={20} />
						</Button>
						<Button variant="ghost" size="icon">
							<ChevronRight size={20} />
						</Button>
					</div>
				</div>
			</div>
		</Page>
	);

	async function fetchExercises() {
		const { data: exercises } = await api.get("/exercise");

		return exercises;
	}

	function handleRowsPerPageChange(rows: string) {
		navigate({
			search: {
				rows: Number(rows),
			},
		});
	}

	async function createExercise({
		name,
		restTime,
		instructions,
		muscleGroups,
	}: CreateExerciseForm) {
		const instructionsRawDraft = convertToRaw(instructions.getCurrentContent());

		await api.post("/exercise", {
			name,
			restTime,
			instructions: instructionsRawDraft,
			muscleGroups: muscleGroups.map(
				({ label, ...muscleGroup }) => muscleGroup,
			),
		});
	}

	async function fetchMuscleGroups() {
		const { data: muscleGroups } =
			await api.get<MuscleGroup[]>("/muscle-group");

		return muscleGroups.map((muscleGroup) => ({
			label: muscleGroup.name,
			value: muscleGroup.id,
			weight: 1,
		}));
	}

	async function createMuscleGroup({ name }: CreateMuscleGroupForm) {
		const { data: muscleGroup } = await api.post<MuscleGroup>("/muscle-group", {
			name,
		});

		focusedMuscleGroup.value = {
			label: muscleGroup.name,
			value: muscleGroup.id,
			weight: 1,
		};
		isAddMuscleGroupDialogOpen.value = true;
	}

	async function handleDeleteMuscleGroup(id: number) {
		await api.delete(`/muscle-group/${id}`);
	}

	async function handleUpdateMuscleGroup({ label, value }: SelectOption) {
		await api.put(`/muscle-group/${value}`, {
			name: label,
		});
	}
}

function CustomMultiValueLabel(props: MultiValueGenericProps<SelectOption>) {
	return (
		<components.MultiValueLabel {...props}>
			{props.data.label}{" "}
			<Badge
				variant="secondary"
				className="cursor-pointer"
				onClick={handleBadgeClick}
			>
				x {props.data.weight}
			</Badge>
		</components.MultiValueLabel>
	);

	function handleBadgeClick(event: MouseEvent) {
		event.stopPropagation();
		focusedMuscleGroup.value = {
			label: props.data.label,
			value: props.data.value,
			weight: props.data.weight,
		};
		isUpdateMuscleGroupWeightDialogOpen.value = true;
	}
}

function CustomOption({
	innerProps: { onClick, ...innerProps },
	...props
}: OptionProps<SelectOption>) {
	return (
		<components.Option
			innerProps={{
				onClick: handleOptionClick,
				...innerProps,
			}}
			{...props}
			className="group"
		>
			<div class="flex justify-between items-center">
				{props.children}
				{typeof props.data.value === "number" && (
					<div class="sr-only group-hover:not-sr-only flex items-center">
						<Button
							size="icon"
							variant="ghost"
							className="h-min w-min p-1"
							onClick={handleEditButtonClick}
							type="button"
						>
							<Pencil size={16} />
						</Button>
						<Button
							size="icon"
							variant="ghost"
							className="h-min w-min p-1"
							onClick={handleDeleteButtonClick}
							type="button"
						>
							<Trash2 size={16} />
						</Button>
					</div>
				)}
			</div>
		</components.Option>
	);

	function handleDeleteButtonClick(event: MouseEvent) {
		event.stopPropagation();
		focusedMuscleGroup.value = {
			label: props.data.label,
			value: props.data.value,
			weight: 0,
		};
		isDeleteMuscleGroupDialogOpen.value = true;
	}

	function handleEditButtonClick(event: MouseEvent) {
		event.stopPropagation();
		focusedMuscleGroup.value = {
			label: props.data.label,
			value: props.data.value,
			weight: 0,
		};
		isRenameMuscleGroupDialogOpen.value = true;
	}

	function handleOptionClick(event: any) {
		if (typeof props.data.value === "number") {
			focusedMuscleGroup.value = {
				label: props.data.label,
				value: props.data.value,
				weight: 1,
			};
			isAddMuscleGroupDialogOpen.value = true;
		} else {
			onClick && onClick(event);
		}
	}
}
