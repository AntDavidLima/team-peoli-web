import { yupResolver } from "@hookform/resolvers/yup";
import { useForm } from "react-hook-form";
import {
  TotalSetsByMuscleGroup,
  totalSetsByMuscleGroupByRoutine,
} from "../-components/SetsCalc";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Save, Trash2, X } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale/pt-BR";
import { Calendar } from "@/components/ui/calendar";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import { APIError, api } from "@/lib/api";
import { IExercise } from "../../exercise";
import { EditorState, convertFromRaw, convertToRaw } from "draft-js";
import { RawDraftContentState } from "react-draft-wysiwyg";
import { AxiosError } from "axios";
import { toast } from "@/components/ui/use-toast";
import * as yup from "yup";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { effect, signal } from "@preact/signals";
import { Day } from "../$id";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { SortableItem } from "./SortableItem";

export interface RoutineProps {
  name: string;
  id: number;
  startDate: Date;
  endDate: Date | null;
  orientations: RawDraftContentState | null;
  trainings: Trainings[];
  studentId: string;
}

interface Trainings {
  id: number;
  name: string;
  exercises: TrainingExercise[];
  day: Day;
}

interface TrainingExercise {
  sets: number;
  reps: string;
  orientations: RawDraftContentState | null;
  restTime: number;
  exercise: ExerciseExercise;
}

interface ExerciseExercise {
  id: number;
  name: string;
  executionVideoUrl: string | null;
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
      id: yup.number().required(),
      name: yup
        .string()
        .when("exercises", (exercises) =>
          exercises.at(0)?.length > 0
            ? yup.string().required("Campo obrigatório")
            : yup.string(),
        ),
      day: yup.string().required("Campo obrigatório"),
      exercises: yup.array().of(
        yup.object({
          sets: yup.number().required("Campo obrigatório"),
          reps: yup.string().required("Campo obrigatório"),
          exerciseId: yup.number().notOneOf([0], "Selecione um exercício"),
          orientations: yup.mixed<EditorState>().required("Campo obrigatório"),
          restTime: yup.number().required("Campo obrigatório"),
          uid: yup.string().required(),
        }),
      ),
    }),
  ),
});

type RoutineFormSchema = yup.InferType<typeof routineFormSchema>;

const isDeleteRoutineDialogOpen = signal(false);

export function Routine({
  name,
  id,
  trainings,
  orientations,
  endDate,
  startDate,
  studentId,
}: RoutineProps) {
  const form = useForm({
    resolver: yupResolver(routineFormSchema),
    defaultValues: {
      startDate: startDate || new Date(),
      endDate: endDate || undefined,
      orientations: orientations
        ? EditorState.createWithContent(convertFromRaw(orientations))
        : EditorState.createEmpty(),
      name,
      trainings: trainings.map(({ exercises, name, ...training }) => ({
        ...training,
        name: name || undefined,
        exercises: exercises.map(
          ({ orientations, exercise: { id }, ...exercise }) => ({
            ...exercise,
            exerciseId: id,
            orientations: orientations
              ? EditorState.createWithContent(convertFromRaw(orientations))
              : EditorState.createEmpty(),
            uid:
              Date.now().toString(36) + Math.random().toString(36).substring(2),
          }),
        ),
      })),
    },
  });

  const queryClient = useQueryClient();

  const {
    data: [_totalExercises, exercises],
  } = useQuery({
    queryKey: [`student/exercises`],
    queryFn: fetchExercises,
    initialData: [0, []],
  });

  const { mutate: updateRoutine } = useMutation({
    mutationFn: patchRoutine,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["student", studentId, "routines"],
      });
      toast({
        title: "Rotina atualizada com sucesso",
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

        if (typeof apiError.error === "object") {
          toast({
            title:
              "Não foi possivel atualizar a rotina pelos seguintes motivos:",
            description: apiError.error.details.map(
              (detail) => `• ${detail.message}`,
            ),
            variant: "destructive",
          });
        }
      }
    },
  });

  const { mutate: deleteRoutine } = useMutation({
    mutationFn: destroyRoutine,
    onSuccess: () => {
      form.setValue("trainings", []);
      queryClient.invalidateQueries({
        queryKey: ["student", studentId, "routines"],
      });
      toast({
        title: "Rotina deletada com sucesso",
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

        if (typeof apiError.error === "object") {
          toast({
            title: "Não foi possivel deletar a rotina pelos seguintes motivos:",
            description: apiError.error.details.map(
              (detail) => `• ${detail.message}`,
            ),
            variant: "destructive",
          });
        }
      }
    },
  });

  effect(() => {
    totalSetsByMuscleGroupByRoutine.value = {
      ...totalSetsByMuscleGroupByRoutine.peek(),
      [id]: (form.watch("trainings") || []).reduce(
        (setsByMuscleGroupOnTrainig, training) => {
          const totalSetsByMuscleGroupOnExercise = (
            training.exercises || []
          ).reduce((setsByMuscleGroupOnExercise, exercise) => {
            const apiExercise = exercises?.find(
              (apiExercise) => apiExercise.id === exercise.exerciseId,
            );

            const totalSetsByMuscleGroupOnExercisedMuscleGroups = (
              apiExercise?.muscleGroups || []
            ).reduce(
              (
                setsByMuscleGroupOnExercisedMuscleGroup,
                exercisedMuscleGroup,
              ) => {
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
      ),
    };
  });

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  return (
    <div class="bg-card rounded p-6">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(updateRoutine)} class="space-y-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem className="flex-1">
                <FormControl>
                  <div class="flex items-center gap-2">
                    <Input placeholder="Nome da rotina de treinos" {...field} />
                    <Button
                      size="icon"
                      variant="ghost"
                      type="button"
                      onClick={handleDeleteButtonClick}
                    >
                      <Trash2 size={16} />
                    </Button>
                    <Button size="icon" variant="ghost">
                      <Save size={16} />
                    </Button>
                    <AlertDialog
                      open={isDeleteRoutineDialogOpen.value}
                      onOpenChange={() =>
                        (isDeleteRoutineDialogOpen.value = false)
                      }
                    >
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Deletar rotina</AlertDialogTitle>
                          <AlertDialogDescription>
                            Tem certeza que deseja apagar esta rotina?
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            className="bg-destructive hover:bg-destructive/80"
                            onClick={() => deleteRoutine()}
                          >
                            Deletar
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
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
            <TabsList className="data-[error=true]:[&>button]:bg-destructive data-[error=true]:[&>button]:text-white bg-background w-fit rounded-full data-[state='active']:[&>button]:bg-primary [&>button]:rounded-full">
              {Object.entries(Day).map(([value, label], index) => (
                <TabsTrigger
                  key={value}
                  value={value}
                  data-error={!!form.getFieldState(`trainings.${index}`).error}
                >
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
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={(event: {
                    active: { id: string };
                    over: { id: string };
                  }) => {
                    const { active, over } = event;

                    const items = form.getValues(
                      `trainings.${index}.exercises`,
                    )!;

                    const newItems = arrayMove(
                      items,
                      items.findIndex((exercise) => exercise.uid === active.id),
                      items.findIndex((exercise) => exercise.uid === over.id),
                    );

                    form.setValue(
                      `trainings.${index}.exercises`,
                      newItems.map((item) => ({
                        ...item,
                        uid:
                          Date.now().toString(36) +
                          Math.random().toString(36).substring(2),
                      })),
                    );
                  }}
                >
                  <SortableContext
                    items={(
                      form.watch(`trainings.${index}.exercises`) || []
                    ).map((exercise) => exercise.uid)}
                    strategy={verticalListSortingStrategy}
                  >
                    {form
                      .watch(`trainings.${index}.exercises`)
                      ?.map((exercise, exerciseIndex) => (
                        <SortableItem id={exercise.uid} key={exercise.uid}>
                          <div class="border border-white rounded p-4 border-dashed space-y-6 relative bg-card">
                            <div class="grid grid-cols-11 gap-2">
                              <FormField
                                control={form.control}
                                name={`trainings.${index}.exercises.${exerciseIndex}.exerciseId`}
                                render={({ field: { value } }) => (
                                  <FormItem className="col-span-4">
                                    <FormLabel>Exercício</FormLabel>
                                    <Popover>
                                      <FormControl>
                                        <PopoverTrigger asChild>
                                          <Button
                                            variant="outline"
                                            className="w-full normal-case overflow-hidden text-ellipsis block"
                                            role="combobox"
                                          >
                                            {value ? (
                                              exercises?.find(
                                                (exercise) =>
                                                  exercise.id === value,
                                              )?.name
                                            ) : (
                                              <span>
                                                Selecione um exercício
                                              </span>
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
                                                value={exercise.name}
                                                key={exercise.id}
                                                onSelect={() => {
                                                  form.setValue(
                                                    `trainings.${index}.exercises.${exerciseIndex}.exerciseId`,
                                                    exercise.id,
                                                  );
                                                  form.setValue(
                                                    `trainings.${index}.exercises.${exerciseIndex}.restTime`,
                                                    exercise.restTime,
                                                  );
                                                  form.setValue(
                                                    `trainings.${index}.exercises.${exerciseIndex}.orientations`,
                                                    EditorState.createWithContent(
                                                      convertFromRaw(
                                                        exercise.instructions,
                                                      ),
                                                    ),
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
                                name={`trainings.${index}.exercises.${exerciseIndex}.sets`}
                                render={({ field }) => (
                                  <FormItem className="col-span-2">
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
                                name={`trainings.${index}.exercises.${exerciseIndex}.reps`}
                                render={({ field }) => (
                                  <FormItem className="col-span-3">
                                    <FormLabel>Repetições</FormLabel>
                                    <FormControl>
                                      <Input placeholder="10 - 12" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={form.control}
                                name={`trainings.${index}.exercises.${exerciseIndex}.restTime`}
                                render={({ field }) => (
                                  <FormItem className="col-span-2">
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
                            <Button
                              size="icon"
                              variant="secondary"
                              className="absolute -right-4 -top-10 bg-background rounded-full hover:bg-destructive"
                              type="button"
                              onClick={() => {
                                form.setValue(
                                  `trainings.${index}.exercises`,
                                  form
                                    .getValues(`trainings.${index}.exercises`)
                                    ?.filter((_, i) => i !== exerciseIndex),
                                );
                              }}
                            >
                              <X size={16} />
                            </Button>
                            <FormField
                              control={form.control}
                              name={`trainings.${index}.exercises.${exerciseIndex}.orientations`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>
                                    Orientações do exercício
                                  </FormLabel>
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
                        </SortableItem>
                      ))}
                  </SortableContext>
                </DndContext>
                <div class="flex justify-center">
                  <Button
                    type="button"
                    onClick={() => {
                      form.setValue(`trainings.${index}.exercises`, [
                        ...(form.getValues(`trainings.${index}.exercises`) ||
                          []),
                        {
                          exerciseId: 0,
                          orientations: EditorState.createEmpty(),
                          reps: "",
                          restTime: 0,
                          sets: 0,
                          uid:
                            Date.now().toString(36) +
                            Math.random().toString(36).substring(2),
                        },
                      ]);
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

  async function patchRoutine({
    name,
    endDate,
    startDate,
    orientations,
    trainings,
  }: RoutineFormSchema) {
    const orientationsRawDraft = convertToRaw(orientations.getCurrentContent());

    const { data: routine } = await api.patch(`/routine/${id}`, {
      name,
      endDate,
      startDate,
      orientations: orientationsRawDraft,
      trainings: trainings?.map((training) => ({
        ...training,
        exercises: training.exercises?.map((exercise, exerciseIndex) => ({
          ...exercise,
          orientations: convertToRaw(exercise.orientations.getCurrentContent()),
          order: exerciseIndex,
        })),
      })),
    });

    return routine;
  }

  async function fetchExercises() {
    const { data: exercises } =
      await api.get<[number, IExercise[]]>("/exercise");

    return exercises;
  }

  async function destroyRoutine() {
    await api.delete(`/routine/${id}`);
  }

  function handleDeleteButtonClick() {
    isDeleteRoutineDialogOpen.value = true;
  }
}

export function mergeSetsByMuscleGroup(
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
