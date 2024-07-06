import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
} from "@/components/ui/command";
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Page } from "@/components/ui/page";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api } from "@/lib/api";
import { yupResolver } from "@hookform/resolvers/yup";
import { signal } from "@preact/signals";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { format, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale/pt-BR";
import { EditorState, convertToRaw } from "draft-js";
import { CalendarIcon, Plus, Save, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import * as yup from "yup";
import { Student } from ".";
import { Exercise, MuscleGroup } from "../exercise";
import { cn } from "@/lib/utils";
import { DateRange } from "react-day-picker";
import {
	VictoryAxis,
	VictoryBar,
	VictoryChart,
	VictoryGroup,
	VictoryLabel,
	VictoryLine,
	VictoryScatter,
	VictoryStack,
} from "victory";

enum Day {
	SUNDAY = "D",
	MONDAY = "S",
	TUESDAY = "T",
	WEDNESDAY = "Q",
	THURSDAY = "Q",
	FRIDAY = "S",
	SATURDAY = "S",
}

export const Route = createFileRoute("/_authenticated/student/$id")({
	component: Component,
});

interface Routine {
	id: number;
	name: string;
}

const routineFormSchema = yup.object({
	name: yup.string().required("Campo obrigatório"),
	startDate: yup
		.date()
		.typeError("Data inválida")
		.required("Campo obrigatório"),
	endDate: yup.date().typeError("Data inválida"),
	orientations: yup.mixed<EditorState>().required(),
	trainings: yup.array().of(
		yup.object({
			name: yup.string().required("Campo obrigatório"),
			day: yup.mixed<Day>().required("Campo obrigatório"),
			exercises: yup.array().of(
				yup.object({
					sets: yup.number().required("Campo obrigatório"),
					reps: yup.number().required("Campo obrigatório"),
					exercise_id: yup.number().required("Campo obrigatório"),
					orientations: yup.mixed<EditorState>().required("Campo obrigatório"),
					rest_time: yup.number().required("Campo obrigatório"),
				}),
			),
		}),
	),
});

type RoutineFormSchema = yup.InferType<typeof routineFormSchema>;

type TotalSetsByMuscleGroup = Record<number, number>;

const totalSetsByMuscleGroup = signal<TotalSetsByMuscleGroup>({});

function Component() {
	const { id } = Route.useParams();

	const queryClient = useQueryClient();

	const [date, setDate] = useState<DateRange | undefined>({
		to: new Date(),
		from: subMonths(new Date(), 1),
	});

	const { data: muscleGroups } = useQuery({
		queryKey: [`muscleGroups`],
		queryFn: () => fetchMuscleGroups(),
	});

	const muscleGroupsByIdMap = Object.fromEntries(
		muscleGroups?.map((group) => [group.id, group.name]) || [],
	);

	const { data: student, isLoading: loadingStudent } = useQuery({
		queryKey: [`student/${id}`],
		queryFn: () => fetchStudent(id),
	});

	const { data: routines } = useQuery({
		queryKey: [`student/${id}/routines`],
		queryFn: () => fetchRoutines(id),
	});

	const { mutate: addRoutine } = useMutation({
		mutationFn: createRoutine,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: [`student/${id}/routines`] });
		},
	});

	const form = useForm({
		resolver: yupResolver(routineFormSchema),
		defaultValues: {
			startDate: new Date(),
			orientations: EditorState.createEmpty(),
		},
	});

	return (
		<Page
			title={student?.name}
			description={student?.email}
			loading={loadingStudent}
		>
			<Tabs defaultValue="trainings">
				<TabsList className="space-x-2 mt-8">
					<TabsTrigger value="trainings">Treinos</TabsTrigger>
					<TabsTrigger value="statistics">Estatisticas</TabsTrigger>
				</TabsList>
				<TabsContent value="trainings">
					<div class="flex gap-4">
						<div>
							<div class="bg-card rounded p-2 w-60 sticky left-0 -top-10">
								<p class="font-semibold">Séries por grupo muscular</p>
								{Object.entries(totalSetsByMuscleGroup.value).map(
									([muscleGroupId, sets]) => (
										<div class="flex justify-between">
											<p>{muscleGroupsByIdMap[muscleGroupId]}</p>
											<p>{sets}</p>
										</div>
									),
								)}
							</div>
						</div>
						<div class="space-y-4 w-full">
							{routines?.map((routine) => (
								<Routine key={routine.id} name={routine.name} />
							))}
							<div class="bg-card rounded p-6">
								<Form {...form}>
									<form onSubmit={form.handleSubmit(addRoutine)}>
										<FormField
											control={form.control}
											name="name"
											render={({ field }) => (
												<FormItem className="flex-1">
													<FormControl>
														<div class="flex items-center gap-2">
															<Input
																placeholder="Nome da rotina de treinos"
																{...field}
															/>
															<Button size="icon" variant="ghost" type="submit">
																<Plus size={22} className="text-muted" />
															</Button>
														</div>
													</FormControl>
													<FormMessage />
												</FormItem>
											)}
										/>
									</form>
								</Form>
							</div>
						</div>
					</div>
				</TabsContent>
				<TabsContent value="statistics">
					<Popover>
						<PopoverTrigger asChild>
							<Button
								className={cn(
									"w-[300px] justify-start text-left font-normal normal-case",
									!date && "text-muted-foreground",
								)}
								variant="outline"
							>
								<CalendarIcon className="mr-2 h-4 w-4" />
								{date?.from ? (
									date.to ? (
										<>
											{format(date.from, "dd MMM, y")} -{" "}
											{format(date.to, "dd MMM, y")}
										</>
									) : (
										format(date.from, "dd MMM, y")
									)
								) : (
									<span>Selecione uma data</span>
								)}
							</Button>
						</PopoverTrigger>
						<PopoverContent className="w-auto p-2" align="start">
							<Calendar
								initialFocus
								mode="range"
								defaultMonth={date?.from}
								selected={date}
								onSelect={setDate}
								numberOfMonths={2}
							/>
						</PopoverContent>
					</Popover>
					<svg style={{ height: 0 }}>
						<defs>
							<linearGradient
								id="blue-to-red"
								x1="0%"
								x2="100%"
								gradientUnits="userSpaceOnUse"
							>
								<stop offset="0%" stopColor="#0B69D4" />
								<stop offset="100%" stopColor="#C43343" />
							</linearGradient>
						</defs>
					</svg>
					<div class="grid-cols-2 grid mt-4 gap-4">
						<div class="bg-card items-center flex flex-col rounded py-4">
							<h2 class="text-lg font-semibold">Supino reto</h2>
							<VictoryChart domain={{ y: [0, 4] }} height={300}>
								<VictoryAxis
									dependentAxis
									tickFormat={(tick) => Math.floor((tick * 40) / 3)}
									style={{
										tickLabels: { fill: "white" },
										axis: { stroke: "#0B69D4", strokeWidth: 4 },
									}}
								/>
								<VictoryAxis
									dependentAxis
									tickFormat={(tick) => Math.floor((tick * 12) / 3)}
									offsetX={400}
									style={{
										tickLabels: { textAnchor: "start", fill: "white" },
										ticks: {
											padding: -20,
										},
										axis: { stroke: "#C43343", strokeWidth: 4 },
									}}
								/>
								<VictoryStack>
									<VictoryChart>
										<VictoryAxis
											tickValues={["3", "4", "5"]}
											style={{
												tickLabels: { fill: "white" },
												axis: {
													strokeWidth: 4,
													stroke: "url(#blue-to-red)",
												},
											}}
										/>
										<VictoryGroup
											data={[
												{ day: "3", load: 100 },
												{ day: "4", load: 110 },
												{ day: "5", load: 120 },
											]}
											color="#0B69D4"
											y={(segment) => segment.load / 120 + 2.5}
											x="day"
										>
											<VictoryScatter />
											<VictoryLine />
										</VictoryGroup>
										<VictoryGroup
											data={[
												{ day: "3", reps: 30 },
												{ day: "4", reps: 28 },
												{ day: "5", reps: 32 },
											]}
											color="#C43343"
											x="day"
											y={(segment) => segment.reps / 32 + 2.5}
										>
											<VictoryScatter />
											<VictoryLine
												style={{
													data: { strokeDasharray: "15, 5" },
												}}
											/>
										</VictoryGroup>
									</VictoryChart>
									<VictoryGroup
										offset={32}
										style={{ labels: { fill: "white" } }}
									>
										<VictoryStack colorScale="cool">
											<VictoryBar
												data={[
													{ day: "3", load: 30 },
													{ day: "4", load: 40 },
													{ day: "5", load: 40 },
												]}
												x="day"
												y={(segment) => segment.load / 40}
												labels={({ datum }) => datum.load}
												labelComponent={<VictoryLabel dy={20} />}
											/>
											<VictoryBar
												data={[
													{ day: "3", load: 35 },
													{ day: "4", load: 35 },
													{ day: "5", load: 40 },
												]}
												x="day"
												y={(segment) => segment.load / 40}
												labels={({ datum }) => datum.load}
												labelComponent={<VictoryLabel dy={20} />}
											/>
											<VictoryBar
												data={[
													{ day: "3", load: 35 },
													{ day: "4", load: 35 },
													{ day: "5", load: 40 },
												]}
												x="day"
												y={(segment) => segment.load / 40}
												labels={({ datum }) => datum.load}
												labelComponent={<VictoryLabel dy={20} />}
											/>
										</VictoryStack>
										<VictoryStack colorScale="warm">
											<VictoryBar
												data={[
													{ day: "3", reps: 10 },
													{ day: "4", reps: 8 },
													{ day: "5", reps: 8 },
												]}
												x="day"
												y={(segment) => segment.reps / 12}
												labels={({ datum }) => datum.reps}
												labelComponent={<VictoryLabel dy={20} />}
											/>
											<VictoryBar
												data={[
													{ day: "3", reps: 10 },
													{ day: "4", reps: 10 },
													{ day: "5", reps: 12 },
												]}
												x="day"
												y={(segment) => segment.reps / 12}
												labels={({ datum }) => datum.reps}
												labelComponent={<VictoryLabel dy={20} />}
											/>
											<VictoryBar
												data={[
													{ day: "3", reps: 10 },
													{ day: "4", reps: 10 },
													{ day: "5", reps: 12 },
												]}
												x="day"
												y={(segment) => segment.reps / 12}
												labels={({ datum }) => datum.reps}
												labelComponent={<VictoryLabel dy={20} />}
											/>
										</VictoryStack>
									</VictoryGroup>
								</VictoryStack>
							</VictoryChart>
							<div class="flex justify-evenly w-full">
								<div class="flex items-center gap-1">
									<div class="rounded-full w-4 aspect-square bg-[#0B69D4]" />
									<p>Carga</p>
								</div>
								<div class="flex items-center gap-1">
									<div class="rounded-full w-4 aspect-square bg-[#C43343]" />
									<p>Repetições</p>
								</div>
							</div>
						</div>
						<div class="bg-card items-center flex flex-col rounded py-4">
							<h2 class="text-lg font-semibold">Supino torto</h2>
							<VictoryChart domain={{ y: [0, 4] }} height={300}>
								<VictoryAxis
									dependentAxis
									tickFormat={(tick) => Math.floor((tick * 40) / 3)}
									style={{
										tickLabels: { fill: "white" },
										axis: { stroke: "#0B69D4", strokeWidth: 4 },
									}}
								/>
								<VictoryAxis
									dependentAxis
									tickFormat={(tick) => Math.floor((tick * 12) / 3)}
									offsetX={400}
									style={{
										tickLabels: { textAnchor: "start", fill: "white" },
										ticks: {
											padding: -20,
										},
										axis: { stroke: "#C43343", strokeWidth: 4 },
									}}
								/>
								<VictoryStack>
									<VictoryChart>
										<VictoryAxis
											tickValues={["3", "4", "5"]}
											style={{
												tickLabels: { fill: "white" },
												axis: {
													strokeWidth: 4,
													stroke: "url(#blue-to-red)",
												},
											}}
										/>
										<VictoryGroup
											data={[
												{ day: "3", load: 100 },
												{ day: "4", load: 110 },
												{ day: "5", load: 120 },
											]}
											color="#0B69D4"
											y={(segment) => segment.load / 120 + 2.5}
											x="day"
										>
											<VictoryScatter />
											<VictoryLine />
										</VictoryGroup>
										<VictoryGroup
											data={[
												{ day: "3", reps: 30 },
												{ day: "4", reps: 28 },
												{ day: "5", reps: 32 },
											]}
											color="#C43343"
											x="day"
											y={(segment) => segment.reps / 32 + 2.5}
										>
											<VictoryScatter />
											<VictoryLine
												style={{
													data: { strokeDasharray: "15, 5" },
												}}
											/>
										</VictoryGroup>
									</VictoryChart>
									<VictoryGroup
										offset={32}
										style={{ labels: { fill: "white" } }}
									>
										<VictoryStack colorScale="cool">
											<VictoryBar
												data={[
													{ day: "3", load: 30 },
													{ day: "4", load: 40 },
													{ day: "5", load: 40 },
												]}
												x="day"
												y={(segment) => segment.load / 40}
												labels={({ datum }) => datum.load}
												labelComponent={<VictoryLabel dy={20} />}
											/>
											<VictoryBar
												data={[
													{ day: "3", load: 35 },
													{ day: "4", load: 35 },
													{ day: "5", load: 40 },
												]}
												x="day"
												y={(segment) => segment.load / 40}
												labels={({ datum }) => datum.load}
												labelComponent={<VictoryLabel dy={20} />}
											/>
											<VictoryBar
												data={[
													{ day: "3", load: 35 },
													{ day: "4", load: 35 },
													{ day: "5", load: 40 },
												]}
												x="day"
												y={(segment) => segment.load / 40}
												labels={({ datum }) => datum.load}
												labelComponent={<VictoryLabel dy={20} />}
											/>
										</VictoryStack>
										<VictoryStack colorScale="warm">
											<VictoryBar
												data={[
													{ day: "3", reps: 10 },
													{ day: "4", reps: 8 },
													{ day: "5", reps: 8 },
												]}
												x="day"
												y={(segment) => segment.reps / 12}
												labels={({ datum }) => datum.reps}
												labelComponent={<VictoryLabel dy={20} />}
											/>
											<VictoryBar
												data={[
													{ day: "3", reps: 10 },
													{ day: "4", reps: 10 },
													{ day: "5", reps: 12 },
												]}
												x="day"
												y={(segment) => segment.reps / 12}
												labels={({ datum }) => datum.reps}
												labelComponent={<VictoryLabel dy={20} />}
											/>
											<VictoryBar
												data={[
													{ day: "3", reps: 10 },
													{ day: "4", reps: 10 },
													{ day: "5", reps: 12 },
												]}
												x="day"
												y={(segment) => segment.reps / 12}
												labels={({ datum }) => datum.reps}
												labelComponent={<VictoryLabel dy={20} />}
											/>
										</VictoryStack>
									</VictoryGroup>
								</VictoryStack>
							</VictoryChart>
							<div class="flex justify-evenly w-full">
								<div class="flex items-center gap-1">
									<div class="rounded-full w-4 aspect-square bg-[#0B69D4]" />
									<p>Carga</p>
								</div>
								<div class="flex items-center gap-1">
									<div class="rounded-full w-4 aspect-square bg-[#C43343]" />
									<p>Repetições</p>
								</div>
							</div>
						</div>
					</div>
				</TabsContent>
			</Tabs>
		</Page>
	);

	async function createRoutine({
		name,
		endDate,
		startDate,
		orientations,
	}: RoutineFormSchema) {
		const orientationsRawDraft = convertToRaw(orientations.getCurrentContent());

		const { data: routine } = await api.post("/routine", {
			name,
			endDate,
			startDate,
			orientations: orientationsRawDraft,
			userId: id,
		});

		return routine;
	}

	async function fetchRoutines(userId: string) {
		const { data: routines } = await api.get<Routine[]>(`/routine`, {
			params: {
				userId,
			},
		});

		return routines;
	}

	async function fetchStudent(id: string) {
		const { data: student } = await api.get<Student>(`user/${id}`);

		return student;
	}

	async function fetchMuscleGroups() {
		const { data: muscleGroups } =
			await api.get<MuscleGroup[]>("/muscle-group");

		return muscleGroups;
	}
}

interface RoutineProps {
	name: string;
}

function Routine({ name }: RoutineProps) {
	const form = useForm({
		resolver: yupResolver(routineFormSchema),
		defaultValues: {
			startDate: new Date(),
			orientations: EditorState.createEmpty(),
			name,
			trainings: [],
		},
	});

	const { data: exercises } = useQuery({
		queryKey: [`student/exercises`],
		queryFn: fetchExercises,
	});

	useEffect(() => {
		totalSetsByMuscleGroup.value = (form.watch("trainings") || []).reduce(
			(setsByMuscleGroupOnTrainig, training) => {
				const totalSetsByMuscleGroupOnExercise = (
					training.exercises || []
				).reduce((setsByMuscleGroupOnExercise, exercise) => {
					const apiExercise = exercises?.find(
						(apiExercise) => apiExercise.id === exercise.exercise_id,
					);

					const totalSetsByMuscleGroupOnExercisedMuscleGroups = (
						apiExercise?.muscleGroups || []
					).reduce(
						(setsByMuscleGroupOnExercisedMuscleGroup, exercisedMuscleGroup) => {
							return mergeSetsByMuscleGroup(
								setsByMuscleGroupOnExercisedMuscleGroup,
								{
									[exercisedMuscleGroup.muscleGroup.id]:
										exercise.sets * exercisedMuscleGroup.weight,
								},
							);
						},
						{},
					);

					return mergeSetsByMuscleGroup(
						setsByMuscleGroupOnExercise,
						totalSetsByMuscleGroupOnExercisedMuscleGroups,
					);
				}, {});

				return mergeSetsByMuscleGroup(
					setsByMuscleGroupOnTrainig,
					totalSetsByMuscleGroupOnExercise,
				);
			},
			{},
		);
	}, [JSON.stringify(form.watch("trainings"))]);

	return (
		<div class="bg-card rounded p-6">
			<Form {...form}>
				<form onSubmit={form.handleSubmit(() => { })} class="space-y-4">
					<FormField
						control={form.control}
						name="name"
						render={({ field }) => (
							<FormItem className="flex-1">
								<FormControl>
									<div class="flex items-center gap-2">
										<Input placeholder="Nome da rotina de treinos" {...field} />
										<Button size="icon" variant="ghost" type="button">
											<Trash2 size={16} />
										</Button>
										<Button size="icon" variant="ghost" type="submit">
											<Save size={16} />
										</Button>
									</div>
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>
					<div class="flex gap-4">
						<FormField
							control={form.control}
							name="startDate"
							render={({ field: { value, onChange } }) => (
								<FormItem className="flex-1">
									<FormLabel>Início</FormLabel>
									<Popover>
										<FormControl>
											<PopoverTrigger asChild>
												<Button
													variant="outline"
													className="w-full normal-case"
												>
													{value ? (
														format(value, "dd 'de' MMMM 'de' yyyy", {
															locale: ptBR,
														})
													) : (
														<span>Selecione uma data</span>
													)}
												</Button>
											</PopoverTrigger>
										</FormControl>
										<PopoverContent>
											<Calendar
												mode="single"
												selected={value}
												onSelect={onChange}
											/>
										</PopoverContent>
									</Popover>
									<FormMessage />
								</FormItem>
							)}
						/>
						<FormField
							control={form.control}
							name="endDate"
							render={({ field: { value, onChange } }) => (
								<FormItem className="flex-1">
									<FormLabel>Fim</FormLabel>
									<Popover>
										<FormControl>
											<PopoverTrigger asChild>
												<Button
													variant="outline"
													className="w-full normal-case"
												>
													{value ? (
														format(value, "dd 'de' MMMM 'de' yyyy", {
															locale: ptBR,
														})
													) : (
														<span>Selecione uma data</span>
													)}
												</Button>
											</PopoverTrigger>
										</FormControl>
										<PopoverContent>
											<Calendar
												mode="single"
												selected={value}
												onSelect={onChange}
												initialFocus
											/>
										</PopoverContent>
									</Popover>
									<FormMessage />
								</FormItem>
							)}
						/>
					</div>
					<FormField
						control={form.control}
						name="orientations"
						render={({ field }) => (
							<FormItem>
								<FormLabel>Orientações gerais</FormLabel>
								<FormControl>
									<RichTextEditor
										{...field}
										placeholder="Orientaçoes para a rotina como um todo"
									/>
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>
					<Tabs defaultValue="MONDAY" class="flex flex-col items-center">
						<TabsList className="bg-background w-fit rounded-full data-[state='active']:[&>button]:bg-primary [&>button]:rounded-full">
							{Object.entries(Day).map(([value, label]) => (
								<TabsTrigger key={value} value={value}>
									{label}
								</TabsTrigger>
							))}
						</TabsList>
						{Object.keys(Day).map((value, index) => (
							<TabsContent
								key={value}
								value={value}
								className="w-full space-y-6 mt-2"
							>
								<FormField
									control={form.control}
									name={`trainings.${index}.name`}
									render={({ field }) => (
										<FormItem>
											<FormLabel>Nome do treino</FormLabel>
											<FormControl>
												<Input placeholder="Treino de x" {...field} />
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
								{form
									.getValues(`trainings.${index}.exercises`)
									?.map((_exercise, trainingIndex) => (
										<div class="border border-white rounded p-4 border-dashed space-y-6">
											<div class="grid grid-cols-5 gap-2">
												<FormField
													control={form.control}
													name={`trainings.${index}.exercises.${trainingIndex}.exercise_id`}
													render={({ field: { value } }) => (
														<FormItem className="col-span-2">
															<FormLabel>Exercício</FormLabel>
															<Popover>
																<FormControl>
																	<PopoverTrigger asChild>
																		<Button
																			variant="outline"
																			className="w-full normal-case"
																			role="combobox"
																		>
																			{value ? (
																				exercises?.find(
																					(exercise) => exercise.id === value,
																				)?.name
																			) : (
																				<span>Selecione um exercício</span>
																			)}
																		</Button>
																	</PopoverTrigger>
																</FormControl>
																<PopoverContent>
																	<Command>
																		<CommandInput placeholder="Buscar exercício..." />
																		<CommandEmpty>
																			Exercício não encontrado.
																		</CommandEmpty>
																		<CommandGroup>
																			{exercises?.map((exercise) => (
																				<CommandItem
																					value={exercise.id.toString()}
																					key={exercise.id}
																					onSelect={() => {
																						form.setValue(
																							`trainings.${index}.exercises.${trainingIndex}.exercise_id`,
																							exercise.id,
																						);
																					}}
																				>
																					{exercise.name}
																				</CommandItem>
																			))}
																		</CommandGroup>
																	</Command>
																</PopoverContent>
															</Popover>
															<FormMessage />
														</FormItem>
													)}
												/>
												<FormField
													control={form.control}
													name={`trainings.${index}.exercises.${trainingIndex}.sets`}
													render={({ field }) => (
														<FormItem>
															<FormLabel>Séries</FormLabel>
															<FormControl>
																<Input
																	type="number"
																	placeholder="0"
																	{...field}
																/>
															</FormControl>
															<FormMessage />
														</FormItem>
													)}
												/>
												<FormField
													control={form.control}
													name={`trainings.${index}.exercises.${trainingIndex}.reps`}
													render={({ field }) => (
														<FormItem>
															<FormLabel>Repetições</FormLabel>
															<FormControl>
																<Input
																	type="number"
																	placeholder="0"
																	{...field}
																/>
															</FormControl>
															<FormMessage />
														</FormItem>
													)}
												/>
												<FormField
													control={form.control}
													name={`trainings.${index}.exercises.${trainingIndex}.rest_time`}
													render={({ field }) => (
														<FormItem>
															<FormLabel>Tempo de descanço</FormLabel>
															<FormControl>
																<Input
																	type="number"
																	placeholder="0s"
																	{...field}
																/>
															</FormControl>
															<FormMessage />
														</FormItem>
													)}
												/>
											</div>
											<FormField
												control={form.control}
												name={`trainings.${index}.exercises.${trainingIndex}.orientations`}
												render={({ field }) => (
													<FormItem>
														<FormLabel>Orientações do exercício</FormLabel>
														<FormControl>
															<RichTextEditor
																{...field}
																placeholder="Orientações específicas para o aluno"
															/>
														</FormControl>
														<FormMessage />
													</FormItem>
												)}
											/>
										</div>
									))}
								<div class="flex justify-center">
									<Button
										type="button"
										onClick={() => {
											form.setValue(
												`trainings.${index}.exercises`,
												[
													...(form.getValues(`trainings.${index}.exercises`) ||
														[]),
													{
														exercise_id: 0,
														orientations: EditorState.createEmpty(),
														reps: 0,
														rest_time: 0,
														sets: 0,
													},
												],
												{ shouldDirty: true },
											);
										}}
									>
										Adicionar exercício
									</Button>
								</div>
							</TabsContent>
						))}
					</Tabs>
				</form>
			</Form>
		</div>
	);

	async function fetchExercises() {
		const { data: exercises } = await api.get<Exercise[]>("/exercise");

		return exercises;
	}

	function mergeSetsByMuscleGroup(
		total: TotalSetsByMuscleGroup,
		current: TotalSetsByMuscleGroup,
	) {
		return Object.entries(current).reduce(
			(accumulatedSetsByMuscleGroup, muscleGroup) => {
				const [muscleGroupId, sets] = muscleGroup;

				return {
					...accumulatedSetsByMuscleGroup,
					[muscleGroupId]:
						(accumulatedSetsByMuscleGroup[Number(muscleGroupId)] || 0) + sets,
				};
			},
			total,
		);
	}
}
