/**
 * How a point value reads on a tile, chip or toast: "+3", "-2", or "✓" for a
 * 0-point habit — a chore that's acknowledged as done but no longer earns a
 * marble once it has become a habit.
 */
export function pointsLabel(points: number): string {
  if (points > 0) return `+${points}`;
  if (points === 0) return "✓";
  return String(points);
}
