import type { Achievement, Goal } from "@/types/database";

/**
 * Centralized UoM scoring engine.
 *
 *  - numeric_min / percent_min — higher is better, score = actual / target * 100, capped 100
 *  - numeric_max / percent_max — lower is better, score = target / actual * 100, capped 100
 *  - timeline                  — actual_date <= target_date ? 100 : 0
 *  - zero                      — actual === 0 ? 100 : 0
 *
 * Returns null when there isn't enough data to compute a score (so UIs can show em-dash).
 */
export function computeScore(
  goal: Pick<Goal, "uom_type" | "target" | "target_date">,
  achievement: Pick<Achievement, "actual_value" | "actual_date"> | null
): number | null {
  if (goal.uom_type === "zero") {
    if (!achievement || achievement.actual_value == null) return null;
    return achievement.actual_value === 0 ? 100 : 0;
  }

  if (goal.uom_type === "timeline") {
    if (!achievement?.actual_date || !goal.target_date) return null;
    return achievement.actual_date <= goal.target_date ? 100 : 0;
  }

  if (!achievement || achievement.actual_value == null || goal.target == null) return null;

  if (goal.uom_type === "numeric_min" || goal.uom_type === "percent_min") {
    if (goal.target === 0) return 100;
    return Math.min((achievement.actual_value / goal.target) * 100, 100);
  }

  if (goal.uom_type === "numeric_max" || goal.uom_type === "percent_max") {
    if (achievement.actual_value === 0) return null;
    return Math.min((goal.target / achievement.actual_value) * 100, 100);
  }

  return null;
}

/** Weighted score for a sheet in a quarter. */
export function computeSheetScore(
  goals: Array<Pick<Goal, "id" | "uom_type" | "target" | "target_date" | "weightage">>,
  achievements: Array<Pick<Achievement, "goal_id" | "actual_value" | "actual_date">>
): number | null {
  if (goals.length === 0) return null;
  let total = 0;
  let weightSum = 0;
  for (const g of goals) {
    const a = achievements.find((x) => x.goal_id === g.id) ?? null;
    const score = computeScore(g, a);
    if (score != null) {
      total += (g.weightage * score) / 100;
      weightSum += g.weightage;
    }
  }
  if (weightSum === 0) return null;
  return total;
}
