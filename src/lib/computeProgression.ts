import { WorkoutSet } from '../types';

export function computeProgression(
  currentSets: WorkoutSet[],
  previousSets?: WorkoutSet[]
): boolean {
  if (!previousSets || previousSets.length === 0) return false;
  if (currentSets.length === 0) return false;

  // Simple progression: compare max volume (weight * reps) or max weight
  // For each set in current, is there a set in previous that we beat?

  const currentMaxVol = Math.max(...currentSets.map(s => s.weight * s.reps));
  const previousMaxVol = Math.max(...previousSets.map(s => s.weight * s.reps));

  if (currentMaxVol > previousMaxVol) return true;

  const currentMaxWeight = Math.max(...currentSets.map(s => s.weight));
  const previousMaxWeight = Math.max(...previousSets.map(s => s.weight));

  if (currentMaxWeight > previousMaxWeight) return true;
  
  // If weight is same, did reps increase?
  if (currentMaxWeight === previousMaxWeight) {
    const currentRepsAtMax = currentSets.filter(s => s.weight === currentMaxWeight).reduce((acc, s) => acc + s.reps, 0);
    const prevRepsAtMax = previousSets.filter(s => s.weight === previousMaxWeight).reduce((acc, s) => acc + s.reps, 0);
    if (currentRepsAtMax > prevRepsAtMax) return true;
  }

  return false;
}
