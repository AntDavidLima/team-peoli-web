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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { yupResolver } from "@hookform/resolvers/yup";
import { signal } from "@preact/signals";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { format, subMonths } from "date-fns";
import { CalendarIcon, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { DateRange } from "react-day-picker";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import * as yup from "yup";
import { Student } from ".";
import { MuscleGroup } from "../exercise";
import { Chart } from "./-components/Chart";
import { Routine, RoutineProps } from "./-components/Routine";
import { SetsCalc } from "./-components/SetsCalc";
import { PeriodSummary } from "./-components/PeriodSummary";

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

interface Exercise {
  id: number;
  name: string;
  workouts: Workout[];
}

export interface Workout {
  WorkoutExerciseSets: WorkoutExerciseSet[];
  workout: {
    startTime: string;
  };
}

export interface WorkoutExerciseSet {
  id: number;
  load: number;
  reps: number;
}

interface Training {
  id: number;
  name: string;
  exercises: {
    exercise: {
      id: number;
    };
  }[];
}

interface RoutineWithTrainings {
  id: number;
  name: string;
  trainings: Training[];
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
}

const ALL_TRAININGS_VALUE = "Todos";

const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const sign = data.percentage >= 0 ? "+" : "";
    const formattedPercentage = data.percentage.toFixed(1);

    return (
      <div className="bg-background border border-border p-3 rounded-lg shadow-lg text-sm">
        <p className="label text-muted-foreground mb-1">{`Semana de ${label}`}</p>
        <p className="intro font-bold text-foreground">
          {`${data.absoluteValue.toFixed(1)} kg (${sign}${formattedPercentage}%)`}
        </p>
      </div>
    );
  }

  return null;
};

const date = signal<DateRange | undefined>({
  from: subMonths(new Date(), 1),
  to: new Date(),
});

function StudentDetails() {
  const { id } = Route.useParams();

  const form = useForm({
    resolver: yupResolver(routineFormSchema),
    defaultValues: {
      name: "",
    },
  });

  const queryClient = useQueryClient();

  const { data: datedExercises, isLoading: isLoadingExercises } = useQuery({
    queryKey: ["student", id, "exercises", date.value?.from, date.value?.to],
    queryFn: fetchExercisesByDate,
  });

  const { data: muscleGroups } = useQuery({
    queryKey: [`muscleGroups`],
    queryFn: () => fetchMuscleGroups(),
  });

  const muscleGroupsByIdMap = Object.fromEntries(
    muscleGroups?.map((group) => [group.id, group.name]) || []
  );

  const { data: student, isLoading: loadingStudent } = useQuery({
    queryKey: [`student`, id],
    queryFn: () => fetchStudent(id),
  });

  const { data: routinesForTrainingList } = useQuery({
    queryKey: ["student", id, "routines"],
    queryFn: () => fetchRoutinesForTrainingDisplay(id),
  });

  const { data: routinesForDropdown, isLoading: isLoadingRoutines } = useQuery({
    queryKey: ["routinesForDropdown", id],
    queryFn: () => fetchRoutinesWithTrainings(id),
    enabled: !!id,
  });

  const { mutate: addRoutine } = useMutation({
    mutationFn: createRoutine,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["student", id, "routines"] });
      form.reset();
    },
  });

  const [selectedTraining, setSelectedTraining] = useState<string | number>(
    ALL_TRAININGS_VALUE
  );

  const allTrainings = useMemo(() => {
    if (!routinesForDropdown) return [];
    return routinesForDropdown.flatMap((routine) => routine.trainings);
  }, [routinesForDropdown]);

  const displayedExercises = useMemo(() => {
    if (!datedExercises) return [];
    if (selectedTraining === ALL_TRAININGS_VALUE) {
      return datedExercises;
    }
    if (!allTrainings) return [];
    const training = allTrainings.find((t) => t.id === selectedTraining);
    if (!training) return [];
    const exerciseIdsInTraining = new Set(
      training.exercises.map((e) => e.exercise.id)
    );
    return datedExercises.filter((exercise) =>
      exerciseIdsInTraining.has(exercise.id)
    );
  }, [datedExercises, allTrainings, selectedTraining]);

  const isProgressionLoading = isLoadingExercises || isLoadingRoutines;

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
          <TabsTrigger value="progression">Progressão</TabsTrigger>
        </TabsList>

        <TabsContent value="trainings">
          <div className="flex gap-4">
            <SetsCalc muscleGroupsByIdMap={muscleGroupsByIdMap} />
            <div className="space-y-4 w-full">
              {routinesForTrainingList?.map((routine) => (
                <Routine
                  key={routine.id}
                  name={routine.name}
                  id={routine.id}
                  startDate={routine.startDate}
                  endDate={routine.endDate}
                  orientations={routine.orientations}
                  trainings={routine.trainings}
                  studentId={id}
                />
              ))}
              <div className="bg-card rounded p-6">
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(addRoutine)}>
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem className="flex-1">
                          <FormControl>
                            <div className="flex items-center gap-2">
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
                  !date && "text-muted-foreground"
                )}
                variant="outline"
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {date.value?.from ? (
                  date.value.to ? (
                    <>
                      {format(date.value.from, "dd MMM, y")} -{" "}
                      {format(date.value.to, "dd MMM, y")}
                    </>
                  ) : (
                    format(date.value.from, "dd MMM, y")
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
                defaultMonth={date.value?.from}
                selected={date.value}
                onSelect={(newDate) => {
                  date.value = newDate;
                }}
                numberOfMonths={2}
              />
            </PopoverContent>
          </Popover>
          <div className="mt-4 space-y-4">
            {datedExercises?.map(({ name, id, workouts }) => {
              const workoutMetadata = workouts.reduce(
                (accumulator, workout) => {
                  const localMaxes = workout.WorkoutExerciseSets.reduce(
                    (localAccumulator, set) => ({
                      maxLoad: Math.max(localAccumulator.maxLoad, set.load),
                      maxReps: Math.max(localAccumulator.maxReps, set.reps),
                    }),
                    { maxLoad: 0, maxReps: 0 }
                  );
                  return {
                    maxLoad: Math.max(accumulator.maxLoad, localMaxes.maxLoad),
                    maxReps: Math.max(accumulator.maxReps, localMaxes.maxReps),
                    maxSets: Math.max(
                      accumulator.maxSets,
                      workout.WorkoutExerciseSets.length
                    ),
                  };
                },
                { maxLoad: 0, maxReps: 0, maxSets: 0 }
              );
              return (
                <Chart
                  name={name}
                  workoutMetadata={workoutMetadata}
                  workouts={workouts}
                  key={id}
                />
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="progression">
          <div className="flex flex-wrap items-center gap-4 mb-4">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  className={cn(
                    "w-[300px] justify-start text-left font-normal normal-case",
                    !date && "text-muted-foreground"
                  )}
                  variant="outline"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date.value?.from ? (
                    date.value.to ? (
                      <>
                        {format(date.value.from, "dd MMM, y")} -{" "}
                        {format(date.value.to, "dd MMM, y")}
                      </>
                    ) : (
                      format(date.value.from, "dd MMM, y")
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
                  defaultMonth={date.value?.from}
                  selected={date.value}
                  onSelect={(newDate) => {
                    date.value = newDate;
                  }}
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>
            <Select
              onValueChange={(value) =>
                setSelectedTraining(
                  value === ALL_TRAININGS_VALUE ? value : Number(value)
                )
              }
              defaultValue={ALL_TRAININGS_VALUE}
            >
              <SelectTrigger className="w-full sm:w-[280px]">
                <SelectValue placeholder="Filtrar por treino" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_TRAININGS_VALUE}>
                  Todos os treinos
                </SelectItem>
                {allTrainings.map((training) => (
                  <SelectItem key={training.id} value={String(training.id)}>
                    {training.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {isProgressionLoading && <p>Carregando progressão...</p>}

          {!isProgressionLoading && displayedExercises && displayedExercises.length > 0 && (
            <PeriodSummary exercises={displayedExercises} />
          )}

          {!isProgressionLoading &&
            (!displayedExercises || displayedExercises.length === 0) && (
              <div className="text-center text-muted-foreground mt-8">
                <p>
                  Não há dados suficientes para gerar um gráfico de progressão
                  para o período ou treino selecionado.
                </p>
              </div>
            )}

          <div className="space-y-4 mt-4">
            {displayedExercises?.map((exercise) => (
              <ProgressionChart
                key={exercise.id}
                name={exercise.name}
                workouts={exercise.workouts}
              />
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </Page>
  );

  async function fetchExercisesByDate() {
    const { data: exercises } = await api.get<Exercise[]>(
      `/user/${id}/exercise`,
      {
        params: {
          startDate: date.value?.from,
          endDate: date.value?.to,
        },
      }
    );
    return exercises;
  }

  async function createRoutine({ name }: RoutineFormSchema) {
    const { data: routine } = await api.post("/routine", {
      name,
      userId: id,
      startDate: new Date(),
    });
    return routine;
  }

  async function fetchRoutinesForTrainingDisplay(userId: string) {
    const { data: routines } = await api.get<RoutineProps[]>(`/routine`, {
      params: {
        userId,
        listEmpty: true,
      },
    });
    return routines;
  }

  async function fetchRoutinesWithTrainings(userId: string) {
    const { data } = await api.get<RoutineWithTrainings[]>(`/routine`, {
      params: {
        userId,
      },
    });
    return data;
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

interface CustomChartLabelProps {
  x?: number;
  y?: number;
  index?: number;
  chartData: ChartDataPoint[];
  type: "absolute" | "percentage";
}

interface ChartDataPoint {
  date: string;
  percentage: number;
  absoluteValue: number;
}

const CustomChartLabel = ({ x, y, index, chartData, type }: CustomChartLabelProps) => {
  if (x === undefined || y === undefined || index === undefined || !chartData) {
    return null;
  }

  const dataPoint = chartData[index];
  if (!dataPoint) return null;

  let labelText = "";
  let dy = 0;

  if (type === "absolute") {
    labelText = `${Math.round(dataPoint.absoluteValue)}kg`;
    dy = 25;
  } else {
    const sign = dataPoint.percentage >= 0 ? "+" : "";
    const percentageValue = dataPoint.percentage.toFixed(1);
    labelText = `${sign}${percentageValue}%`;
    dy = -10;
  }

  return (
    <text
      x={x}
      y={y}
      dy={dy}
      fill="hsl(var(--muted-foreground))"
      fontSize={12}
      textAnchor="middle"
    >
      {labelText}
    </text>
  );
};


interface ProgressionChartProps {
  name: string;
  workouts: Workout[];
}


function ProgressionChart({ name, workouts }: ProgressionChartProps) {
  const {
    chartData,
    totalEvolutionPercentage,
    minDomain,
    maxDomain,
    tickValues,
  } = useMemo(() => {
    const defaultReturn = {
      chartData: [],
      totalEvolutionPercentage: 0,
      minDomain: -50,
      maxDomain: 50,
      tickValues: [-50, -25, 0, 25, 50],
    };

    if (!workouts || workouts.length === 0) {
      return defaultReturn;
    }

    const weeklyData = workouts.reduce(
      (acc, { workout, WorkoutExerciseSets }) => {
        const date = new Date(workout.startTime);
        const dayOfWeek = date.getDay();
        const weekStartDate = new Date(date);
        weekStartDate.setDate(date.getDate() - dayOfWeek);
        weekStartDate.setHours(0, 0, 0, 0);
        const weekKey = weekStartDate.toISOString();

        const workoutVolume = WorkoutExerciseSets.reduce((total, set) => {
          const load = Number(set.load) || 0;
          const reps = Number(set.reps) || 0;
          return total + load * reps;
        }, 0);

        if (workoutVolume > 0) {
          acc[weekKey] = (acc[weekKey] || 0) + workoutVolume;
        }
        return acc;
      },
      {} as Record<string, number>
    );

    const sortedData = Object.entries(weeklyData)
      .map(([dateStr, volume]) => ({
        day: new Date(dateStr),
        value: volume,
      }))
      .sort((a, b) => a.day.getTime() - b.day.getTime());

    if (sortedData.length < 2) {
      return defaultReturn;
    }

    const firstValue = sortedData[0].value;
    const lastValue = sortedData[sortedData.length - 1].value;
    const evolution =
      firstValue !== 0 ? ((lastValue - firstValue) / firstValue) * 100 : 0;

    const finalChartData: ChartDataPoint[] = sortedData.map((point) => ({
      date: point.day.toLocaleDateString("pt-BR", {
        month: "short",
        day: "2-digit",
      }),
      percentage:
        firstValue !== 0 ? ((point.value - firstValue) / firstValue) * 100 : 0,
      absoluteValue: point.value,
    }));

    const yValues = finalChartData.map((d) => d.percentage);
    const maxAbsY = Math.max(...yValues.map((v) => Math.abs(v)));
    const padding = maxAbsY * 0.4 || 20;
    const calculatedMinDomain = -maxAbsY - padding;
    const calculatedMaxDomain = maxAbsY + padding;

    const TICK_COUNT = 5;
    const domainRange = calculatedMaxDomain - calculatedMinDomain;
    const step = domainRange / (TICK_COUNT - 1);
    const calculatedTicks = Array.from(
      { length: TICK_COUNT },
      (_, i) => calculatedMinDomain + i * step
    );

    return {
      chartData: finalChartData,
      totalEvolutionPercentage: evolution,
      minDomain: Math.floor(calculatedMinDomain),
      maxDomain: Math.ceil(calculatedMaxDomain),
      tickValues: calculatedTicks,
    };
  }, [workouts]);

  if (chartData.length < 2) {
    return null;
  }

  const evolutionColor =
    totalEvolutionPercentage >= -3 && totalEvolutionPercentage <= 0
      ? "#3b82f6"
      : totalEvolutionPercentage > 0
      ? "#4ade80"
      : "#f87171";

  let evolutionLabelText;
  if (Math.abs(totalEvolutionPercentage) <= 5) {
    evolutionLabelText = "Desempenho: Constante";
  } else {
    const sign = totalEvolutionPercentage > 0 ? "+" : "";
    evolutionLabelText = `Desempenho: ${sign}${totalEvolutionPercentage.toFixed(
      1
    )}%`;
  }

  return (
    <div className="bg-card rounded-lg p-4">
      <div className="flex items-baseline gap-4 mb-4">
        <h3 className="font-bold text-lg">{name}</h3>
        <p style={{ color: evolutionColor }} className="text-sm font-semibold">
          {evolutionLabelText}
        </p>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart
          data={chartData}
          margin={{ top: 30, right: 20, left: -20, bottom: 30 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted) / 0.5)" />
          <XAxis
            dataKey="date"
            stroke="hsl(var(--muted-foreground))"
            fontSize={12}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            stroke="hsl(var(--muted-foreground))"
            fontSize={12}
            tickFormatter={(value: number) => `${value}%`}
            domain={[minDomain, maxDomain]}
            ticks={tickValues}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip content={<CustomTooltip />} cursor={false} />
          <ReferenceLine y={0} stroke="hsl(var(--border))" strokeDasharray="3 3" />
          
          <Area
            type="monotone"
            dataKey="percentage"
            stroke="#3b82f6"
            strokeWidth={2}
            fill="#3b82f6"
            fillOpacity={0.2}
            y0={-100}
          />
          
          <Scatter
             dataKey="percentage"
             fill="#3b82f6"
             stroke="hsl(var(--card))"
             strokeWidth={2}
           />

           <Scatter
            dataKey="percentage"
            fill="transparent"
            isAnimationActive={false}
            label={<CustomChartLabel type="percentage" chartData={chartData} />}
          />
          <Scatter
            dataKey="percentage"
            fill="transparent"
            isAnimationActive={false}
            label={<CustomChartLabel type="absolute" chartData={chartData} />}
          />

        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}