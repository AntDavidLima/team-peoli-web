import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Page } from "@/components/ui/page";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api } from "@/lib/api";
import { yupResolver } from "@hookform/resolvers/yup";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { useForm } from "react-hook-form";
import * as yup from "yup";
import { Student } from ".";
import { MuscleGroup } from "../exercise";
import { Routine, RoutineProps } from "./-components/Routine";
import { SetsCalc } from "./-components/SetsCalc";
import { Chart } from "./-components/Chart";

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

function StudentDetails() {
  const { id } = Route.useParams();

  const form = useForm({
    resolver: yupResolver(routineFormSchema),
    defaultValues: {
      name: "",
    },
  });

  const queryClient = useQueryClient();

  const { data: exercises } = useQuery({
    queryKey: ["student", id, "exercises"],
    queryFn: fetchUserExercises,
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
            <SetsCalc muscleGroupsByIdMap={muscleGroupsByIdMap} />
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
                  studentId={id}
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
          <svg style={{ height: 0 }}>
            <defs>
              <linearGradient
                id="red-to-blue"
                x1="0%"
                x2="100%"
                gradientUnits="userSpaceOnUse"
              >
                <stop offset="0%" stopColor="#C43343" />
                <stop offset="100%" stopColor="#0B69D4" />
              </linearGradient>
            </defs>
          </svg>
          <div class="grid-cols-2 grid mt-4 gap-4">
            {exercises?.map(({ name, id, workouts }) => {
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
      </Tabs>
    </Page>
  );

  async function fetchUserExercises() {
    const { data: exercises } = await api.get<Exercise[]>(
      `/user/${id}/exercise`
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

  async function fetchRoutines(userId: string) {
    const { data: routines } = await api.get<RoutineProps[]>(`/routine`, {
      params: {
        userId,
        listEmpty: true,
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
