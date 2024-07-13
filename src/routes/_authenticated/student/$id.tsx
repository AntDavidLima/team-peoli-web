import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Page } from "@/components/ui/page";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api } from "@/lib/api";
import { yupResolver } from "@hookform/resolvers/yup";
import { signal } from "@preact/signals";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { format, subMonths } from "date-fns";
import { CalendarIcon, Plus } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import * as yup from "yup";
import { Student } from ".";
import { MuscleGroup } from "../exercise";
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
import { Routine, RoutineProps } from "./-components/Routine";

export enum Day {
	SUNDAY = "D",
	MONDAY = "S",
	TUESDAY = "T",
	WEDNESDAY = "Q",
	THURSDAY = "Q",
	FRIDAY = "S",
	SATURDAY = "S",
}

export const Route = createFileRoute("/_authenticated/student/$id")({
	component: StudentDetails,
});

export const routineFormSchema = yup.object({
	name: yup.string().required("Campo obrigatório"),
});

type RoutineFormSchema = yup.InferType<typeof routineFormSchema>;

export type TotalSetsByMuscleGroup = Record<number, number>;

export const totalSetsByMuscleGroup = signal<TotalSetsByMuscleGroup>({});

function StudentDetails() {
	const { id } = Route.useParams();

	const form = useForm({
		resolver: yupResolver(routineFormSchema),
		defaultValues: {
			name: "",
		},
	});

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
		queryKey: [`student`, id],
		queryFn: () => fetchStudent(id),
	});

	const { data: routines } = useQuery({
		queryKey: ["student", id, "routines"],
		queryFn: () => fetchRoutines(id),
	});

	const { mutate: addRoutine } = useMutation({
		mutationFn: createRoutine,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["student", id, "routines"] });
			form.reset();
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
								<p class="font-bold">Séries por grupo muscular</p>
								{Object.entries(totalSetsByMuscleGroup.value).length === 0 && (
									<p class="text-muted mt-1">Nenhum treino cadastrado</p>
								)}
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
								<Routine
									key={routine.id}
									name={routine.name}
									id={routine.id}
									startDate={routine.startDate}
									endDate={routine.endDate}
									orientations={routine.orientations}
									trainings={routine.trainings}
								/>
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

	async function createRoutine({ name }: RoutineFormSchema) {
		const { data: routine } = await api.post("/routine", {
			name,
			userId: id,
			startDate: new Date(),
		});

		return routine;
	}

	async function fetchRoutines(userId: string) {
		const { data: routines } = await api.get<RoutineProps[]>(`/routine`, {
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
