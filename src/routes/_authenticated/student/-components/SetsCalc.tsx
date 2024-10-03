import { signal } from "@preact/signals";
import { mergeSetsByMuscleGroup } from "./Routine";

export type TotalSetsByMuscleGroup = Record<number, number>;

type TotalSetsByMuscleGroupByRoutine = Record<number, TotalSetsByMuscleGroup>;

export const totalSetsByMuscleGroupByRoutine =
	signal<TotalSetsByMuscleGroupByRoutine>({});

interface SetsCalcProps {
	muscleGroupsByIdMap: Record<number, string>;
}

export function SetsCalc({ muscleGroupsByIdMap }: SetsCalcProps) {
	return (
		<div>
			<div class="bg-card rounded p-2 w-60 sticky left-0 -top-10">
				<p class="font-bold">Séries por grupo muscular</p>
				{Object.entries(totalSetsByMuscleGroupByRoutine.value).length === 0 && (
					<p class="text-muted mt-1">Nenhum treino cadastrado</p>
				)}
				{Object.entries(
					Object.values(totalSetsByMuscleGroupByRoutine.value).reduce(
						(totalSetsByMuscleGroup, sets) =>
							mergeSetsByMuscleGroup(totalSetsByMuscleGroup, sets),
						{},
					),
				).map(([muscleGroupId, sets]) => (
					<div class="flex justify-between">
						<p>{muscleGroupsByIdMap[Number(muscleGroupId)]}</p>
						<p>{sets}</p>
					</div>
				))}
			</div>
		</div>
	);
}
