import {
  DomainTuple,
  VictoryAxis,
  VictoryBar,
  VictoryBrushContainer,
  VictoryChart,
  VictoryGroup,
  VictoryLabel,
  VictoryLine,
  VictoryScatter,
  VictoryStack,
  VictoryZoomContainer,
} from "victory";
import { Workout, WorkoutExerciseSet } from "../$id";
import { useState } from "react";
import { signal } from "@preact/signals";
import { addHours, subHours } from "date-fns";

type WorkoutMetadata = {
  maxLoad: number;
  maxReps: number;
  maxSets: number;
};

interface Chart {
  name: string;
  workoutMetadata: WorkoutMetadata;
  workouts: Workout[];
}

const zoomDisabled = signal(true);

window.onkeydown = (event) => {
  if (event.shiftKey) {
    zoomDisabled.value = false;
  }
};

window.onkeyup = (event) => {
  if (!event.shiftKey) {
    zoomDisabled.value = true;
  }
};

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  year: "2-digit",
  month: "numeric",
  day: "numeric",
});

export function Chart({ name, workoutMetadata, workouts }: Chart) {
  const [chartDomain, setChartDomain] = useState<{
    x: DomainTuple;
    y: DomainTuple;
  }>();

  return (
    <div class="bg-card items-center flex flex-col rounded py-4">
      <h2 class="text-lg font-semibold">{name}</h2>
      <VictoryChart
        height={64}
        padding={{
          left: 32,
          right: 32,
          top: 8,
          bottom: 24,
        }}
        domain={{
          y: [0, workoutMetadata.maxSets],
          x: [
            subHours(new Date(workouts[0].workout.startTime), 26),
            addHours(
              new Date(workouts[workouts.length - 1].workout.startTime),
              26
            ),
          ],
        }}
        scale={{ x: "time" }}
        containerComponent={
          <VictoryBrushContainer
            brushDimension="x"
            brushDomain={chartDomain}
            onBrushDomainChange={(domain) => setChartDomain(domain)}
          />
        }
      >
        <VictoryAxis
          style={{
            tickLabels: { fill: "white", fontSize: 10 },
            axis: {
              strokeWidth: 3,
              stroke: "url(#red-to-blue)",
            },
          }}
          tickFormat={dateFormatter.format}
        />
        <VictoryGroup color="#0B69D4">
          <VictoryLine
            style={{
              data: { strokeDasharray: "15, 5" },
            }}
            data={workouts.map(({ workout, WorkoutExerciseSets }) => ({
              day: new Date(workout.startTime),
              reps: WorkoutExerciseSets.reduce(
                (total, set) => total + set.reps,
                0
              ),
            }))}
            x="day"
            y={(segment: WorkoutExerciseSet) =>
              segment.reps /
              workouts.reduce((maxReps, { WorkoutExerciseSets }) => {
                const totalReps = WorkoutExerciseSets.reduce(
                  (total, set) => total + set.reps,
                  0
                );

                return Math.max(maxReps, totalReps);
              }, 0)
            }
          />
          <VictoryScatter
            style={{
              data: { strokeDasharray: "15, 5" },
            }}
            data={workouts.map(({ workout, WorkoutExerciseSets }) => ({
              day: new Date(workout.startTime),
              reps: WorkoutExerciseSets.reduce(
                (total, set) => total + set.reps,
                0
              ),
            }))}
            x="day"
            y={(segment: WorkoutExerciseSet) =>
              segment.reps /
              workouts.reduce((maxReps, { WorkoutExerciseSets }) => {
                const totalReps = WorkoutExerciseSets.reduce(
                  (total, set) => total + set.reps,
                  0
                );

                return Math.max(maxReps, totalReps);
              }, 0)
            }
          />
        </VictoryGroup>
        <VictoryGroup color="#C43343">
          <VictoryLine
            data={workouts.map(({ workout, WorkoutExerciseSets }) => ({
              day: new Date(workout.startTime),
              load: WorkoutExerciseSets.reduce(
                (total, set) => total + set.load,
                0
              ),
            }))}
            x="day"
            y={(segment: WorkoutExerciseSet) =>
              segment.load /
              workouts.reduce((maxLoad, { WorkoutExerciseSets }) => {
                const totalLoad = WorkoutExerciseSets.reduce(
                  (total, set) => total + set.load,
                  0
                );

                return Math.max(maxLoad, totalLoad);
              }, 0)
            }
          />
          <VictoryScatter
            data={workouts.map(({ workout, WorkoutExerciseSets }) => ({
              day: new Date(workout.startTime),
              load: WorkoutExerciseSets.reduce(
                (total, set) => total + set.load,
                0
              ),
            }))}
            x="day"
            y={(segment: WorkoutExerciseSet) =>
              segment.load /
              workouts.reduce((maxLoad, { WorkoutExerciseSets }) => {
                const totalLoad = WorkoutExerciseSets.reduce(
                  (total, set) => total + set.load,
                  0
                );

                return Math.max(maxLoad, totalLoad);
              }, 0)
            }
          />
        </VictoryGroup>
      </VictoryChart>
      <VictoryChart
        domain={{
          y: [0, workoutMetadata.maxSets],
          x: [
            subHours(new Date(workouts[0].workout.startTime), 1),
            addHours(new Date(workouts[workouts.length - 1].workout.startTime), 1),
          ],
        }}
        height={216}
        padding={{
          left: 32,
          right: 32,
          top: 16,
          bottom: 32,
        }}
        scale={{ x: "time" }}
        containerComponent={
          <VictoryZoomContainer
            zoomDimension="x"
            zoomDomain={chartDomain}
            onZoomDomainChange={(domain) => setChartDomain(domain)}
            allowZoom={!zoomDisabled.value}
          />
        }
      >
        <VictoryAxis
          style={{
            tickLabels: { fill: "white", fontSize: 10 },
            axis: {
              strokeWidth: 4,
              stroke: "url(#red-to-blue)",
            },
          }}
          tickFormat={dateFormatter.format}
        />
        <VictoryAxis
          dependentAxis
          tickFormat={(tick) =>
            Math.floor(
              (tick * workoutMetadata.maxLoad) / workoutMetadata.maxSets
            )
          }
          style={{
            tickLabels: { fill: "white", fontSize: 10 },
            axis: { stroke: "#C43343", strokeWidth: 4 },
          }}
        />
        <VictoryAxis
          dependentAxis
          tickFormat={(tick) =>
            Math.floor(
              (tick * workoutMetadata.maxReps) / workoutMetadata.maxSets
            )
          }
          orientation="right"
          style={{
            tickLabels: { fill: "white", fontSize: 10 },
            axis: { stroke: "#0B69D4", strokeWidth: 4 },
          }}
        />
        <VictoryGroup style={{ labels: { fill: "white" } }} offset={28}>
          <VictoryStack colorScale="warm">
            {Array.from({ length: workoutMetadata.maxSets }).map((_, set) => (
              <VictoryBar
                data={workouts.map(({ workout, WorkoutExerciseSets }) => ({
                  day: new Date(workout.startTime),
                  load: WorkoutExerciseSets[set]?.load,
                }))}
                barWidth={24}
                x="day"
                y={(segment) =>
                  segment.load /
                  workouts.reduce(
                    (max, workout) =>
                      Math.max(max, workout.WorkoutExerciseSets[set]?.load),
                    0
                  )
                }
                labels={({ datum }: { datum: WorkoutExerciseSet }) =>
                  datum.load
                }
                labelComponent={<VictoryLabel dy={16} />}
              />
            ))}
          </VictoryStack>
          <VictoryStack colorScale="cool">
            {Array.from({ length: workoutMetadata.maxSets }).map((_, set) => (
              <VictoryBar
                data={workouts.map(({ workout, WorkoutExerciseSets }) => ({
                  day: new Date(workout.startTime),
                  reps: WorkoutExerciseSets[set]?.reps,
                }))}
                x="day"
                y={(segment) =>
                  segment.reps /
                  workouts.reduce(
                    (max, workout) =>
                      Math.max(max, workout.WorkoutExerciseSets[set]?.reps),
                    0
                  )
                }
                barWidth={24}
                labels={({ datum }: { datum: WorkoutExerciseSet }) =>
                  datum.reps
                }
                labelComponent={<VictoryLabel dy={16} />}
              />
            ))}
          </VictoryStack>
        </VictoryGroup>
      </VictoryChart>
      <div class="flex justify-evenly w-full">
        <div class="flex items-center gap-1">
          <div class="rounded-full w-4 aspect-square bg-[#C43343]" />
          <p>Carga</p>
        </div>
        <div class="flex items-center gap-1">
          <div class="rounded-full w-4 aspect-square bg-[#0B69D4]" />
          <p>Repetições</p>
        </div>
      </div>
    </div>
  );
}
