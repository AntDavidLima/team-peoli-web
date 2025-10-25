import { useMemo } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";
import { Exercise, Training } from "../$id";

interface PeriodSummaryProps {
  exercises: Exercise[];
  trainings: Training[];
  selectedTrainingId: string | number;
}

const COLORS = {
  progression: "#4ade80",
  constant: "#3b82f6",
  regression: "#f87171",
};

const PeriodSummaryLegend = ({ payload }: { payload: any[] }) => {
  const dataMap = {
    progression: "com progressão",
    constant: "constantes",
    regression: "com regressão",
  };

  return (
    <ul className="flex flex-col gap-2">
      {payload.map((entry: any, index: number) => (
        <li key={`item-${index}`} className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-lg font-boldd">
            {entry.value} Treinos 
            <br/>
            <div  className="text-sm font-light text-foreground">
              {dataMap[entry.dataKey as keyof typeof dataMap]}
            </div>
          </span>
        </li>
      ))}
    </ul>
  );
};

const getWeekKey = (d: Date): string => {
  const date = new Date(d.getTime());
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + 3 - ((date.getDay() + 6) % 7));
  const week1 = new Date(date.getFullYear(), 0, 4);
  const weekNumber =
    1 +
    Math.round(
      ((date.getTime() - week1.getTime()) / 86400000 -
        3 +
        ((week1.getDay() + 6) % 7)) /
        7
    );
  return `${date.getFullYear()}-${String(weekNumber).padStart(2, "0")}`;
};


export function PeriodSummary({ exercises, trainings, selectedTrainingId }: PeriodSummaryProps) {
  const summaryData = useMemo(() => {
    if (!exercises || exercises.length === 0 || !trainings || trainings.length === 0) {
      return null;
    }

    const weeklyComparisonCounters = {
      progression: 0,
      constant: 0,
      regression: 0,
    };

    const relevantTrainings = selectedTrainingId === 'Todos'
      ? trainings
      : trainings.filter(t => t.id === selectedTrainingId);

    const calculateTotalVolumeForWeek = (workouts: typeof exercises[0]["workouts"]) => {
      return workouts.reduce((totalVolume, workout) => {
        const workoutVolume = workout.WorkoutExerciseSets.reduce(
          (acc, set) => acc + (Number(set.load) || 0) * (Number(set.reps) || 0), 0
        );
        return totalVolume + workoutVolume;
      }, 0);
    };

    relevantTrainings.forEach((training) => {
      const exerciseIdsForThisTraining = new Set(training.exercises.map(e => e.exercise.id));
      const exercisesForThisTraining = exercises.filter(ex => exerciseIdsForThisTraining.has(ex.id));
      if (exercisesForThisTraining.length === 0) return;

      const workoutsByWeek = exercisesForThisTraining
        .flatMap((ex) => ex.workouts)
        .reduce((acc, workout) => {
          const weekKey = getWeekKey(new Date(workout.workout.startTime));
          if (!acc[weekKey]) acc[weekKey] = [];
          acc[weekKey].push(workout);
          return acc;
        }, {} as Record<string, typeof exercises[0]["workouts"]>);
      
      const weekKeys = Object.keys(workoutsByWeek).sort();
      if (weekKeys.length < 2) return;

      for (let i = 1; i < weekKeys.length; i++) {
        const previousWeekKey = weekKeys[i - 1];
        const currentWeekKey = weekKeys[i];
        
        const previousWeekVolume = calculateTotalVolumeForWeek(workoutsByWeek[previousWeekKey]);
        const currentWeekVolume = calculateTotalVolumeForWeek(workoutsByWeek[currentWeekKey]);

        if (previousWeekVolume === 0) {
          if (currentWeekVolume > 0) weeklyComparisonCounters.progression += 1;
          continue;
        }

        const evolution = ((currentWeekVolume - previousWeekVolume) / previousWeekVolume) * 100;
        
        if (evolution >= -3 && evolution <= 0) {
          weeklyComparisonCounters.constant += 1;
        } else if (evolution > 0) {
          weeklyComparisonCounters.progression += 1;
        } else {
          weeklyComparisonCounters.regression += 1;
        }
      }
    });

    const totalComparedTrainings =
      weeklyComparisonCounters.progression +
      weeklyComparisonCounters.constant +
      weeklyComparisonCounters.regression;

    const allWorkoutsByWeek = exercises
      .flatMap((ex) => ex.workouts)
      .reduce((acc, workout) => {
        const weekKey = getWeekKey(new Date(workout.workout.startTime));
        if (!acc[weekKey]) acc[weekKey] = [];
        acc[weekKey].push(workout);
        return acc;
      }, {} as Record<string, typeof exercises[0]["workouts"]>);
    const allWeekKeys = Object.keys(allWorkoutsByWeek).sort();
    if (allWeekKeys.length < 2) return null;

    const firstWeekKeyOverall = allWeekKeys[0];
    const lastWeekKeyOverall = allWeekKeys[allWeekKeys.length - 1];
    const getMetricsForWeek = (workoutsInWeek: typeof exercises[0]["workouts"]) => {
      let totalVolume = 0, totalLoad = 0, totalReps = 0, totalSets = 0;
      const trainingDays = new Set<string>();
      workoutsInWeek.forEach((workout) => {
        trainingDays.add(new Date(workout.workout.startTime).toISOString().split('T')[0]);
        workout.WorkoutExerciseSets.forEach((set) => {
          const load = Number(set.load) || 0;
          const reps = Number(set.reps) || 0;
          totalVolume += load * reps;
          totalLoad += load;
          totalReps += reps;
          totalSets += 1;
        });
      });
      const numTrainings = trainingDays.size;
      return {
        totalVolume, totalSets, totalReps, numTrainings,
        avgLoadPerSet: totalSets > 0 ? totalLoad / totalSets : 0,
        avgRepsPerSet: totalSets > 0 ? totalReps / totalSets : 0,
        avgSetsPerTraining: numTrainings > 0 ? totalSets / numTrainings : 0,
      };
    };
    const firstWeekMetrics = getMetricsForWeek(allWorkoutsByWeek[firstWeekKeyOverall]);
    const lastWeekMetrics = getMetricsForWeek(allWorkoutsByWeek[lastWeekKeyOverall]);
    const calculateChange = (first: number, last: number) => {
      if (first === 0) return last > 0 ? 100.0 : 0;
      return ((last - first) / first) * 100;
    };
    
    const pieChartData = [
      { name: "progression", value: weeklyComparisonCounters.progression },
      { name: "constant", value: weeklyComparisonCounters.constant },
      { name: "regression", value: weeklyComparisonCounters.regression },
    ].filter(item => item.value > 0);

    return {
      totalWorkouts: totalComparedTrainings,
      pieChartData,
      totalVolume: lastWeekMetrics.totalVolume,
      volumeChange: calculateChange(firstWeekMetrics.totalVolume, lastWeekMetrics.totalVolume),
      avgLoad: lastWeekMetrics.avgLoadPerSet,
      avgLoadChange: calculateChange(firstWeekMetrics.avgLoadPerSet, lastWeekMetrics.avgLoadPerSet),
      avgReps: lastWeekMetrics.avgRepsPerSet,
      avgRepsChange: calculateChange(firstWeekMetrics.avgRepsPerSet, lastWeekMetrics.avgRepsPerSet),
      avgSets: lastWeekMetrics.avgSetsPerTraining,
      avgSetsChange: calculateChange(firstWeekMetrics.avgSetsPerTraining, lastWeekMetrics.avgSetsPerTraining),
    };
  }, [exercises, trainings, selectedTrainingId]);

  if (!summaryData || summaryData.totalWorkouts === 0) {
    return null;
  }
  
  const formatPercentage = (value: number) => {
    const sign = value > 0 ? "+" : "";
    return `${sign}${value.toFixed(1)}%`;
  }

  const legendPayload = summaryData.pieChartData.map(d => ({
    dataKey: d.name,
    value: d.value,
    color: COLORS[d.name as keyof typeof COLORS]
  }));

  return (
    <div className="bg-card rounded-lg p-6 mb-6">
      <h2 className="text-xl font-bold">Resumo Geral do Período</h2>
      <p className="text-sm text-muted-foreground mb-6">
        Comparando a primeira com a última semana do período selecionado.
      </p>
      <div className="flex flex-col md:flex-row items-center gap-8">
        <div className="w-full md:w-1/3 flex items-center justify-center md:justify-start gap-6">
          <div className="w-40 h-40 relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={summaryData.pieChartData}
                  cx="50%" cy="50%"
                  innerRadius={50} outerRadius={70}
                  paddingAngle={5}
                  dataKey="value" nameKey="name"
                >
                  {summaryData.pieChartData.map((entry) => (
                    <Cell key={entry.name} fill={COLORS[entry.name as keyof typeof COLORS]} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-bold">{summaryData.totalWorkouts}</span>
              <span className="text-sm text-muted-foreground">Treinos</span>
            </div>
          </div>
          <PeriodSummaryLegend payload={legendPayload} />
        </div>

        <div className="w-full md:w-2/3 grid grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-6">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Volume Total</p>
            <p className="text-2xl font-bold">{summaryData.totalVolume.toLocaleString('pt-BR')} kg</p>
            <p className={`text-sm font-semibold ${summaryData.volumeChange >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {formatPercentage(summaryData.volumeChange)}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Carga Média / Série</p>
            <p className="text-2xl font-bold">{summaryData.avgLoad.toFixed(1)} kg</p>
            <p className={`text-sm font-semibold ${summaryData.avgLoadChange >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {formatPercentage(summaryData.avgLoadChange)}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Reps Média / Série</p>
            <p className="text-2xl font-bold">{summaryData.avgReps.toFixed(1)} reps</p>
            <p className={`text-sm font-semibold ${summaryData.avgRepsChange >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {formatPercentage(summaryData.avgRepsChange)}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Séries Média / Treino</p>
            <p className="text-2xl font-bold">{summaryData.avgSets.toFixed(1)} séries</p>
            <p className={`text-sm font-semibold ${summaryData.avgSetsChange >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {formatPercentage(summaryData.avgSetsChange)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}