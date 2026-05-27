"use client";

import { useMemo } from "react";
import type { UomType } from "@/types/database";

export interface GoalLike {
  thrust_area_id?: string | null;
  title?: string;
  description?: string | null;
  uom_type?: UomType;
  target?: number | null;
  target_date?: string | null;
  weightage?: number | null;
  /** Set when this row is a child of a shared parent goal. Such rows do not
   *  count toward the 8-goal-per-sheet cap. */
  parent_goal_id?: string | null;
}

export type GoalField =
  | "thrust_area_id"
  | "title"
  | "description"
  | "uom_type"
  | "target"
  | "target_date"
  | "weightage"
  | "form";

export interface ValidationError {
  goalIndex: number;
  field: GoalField;
  message: string;
}

export interface ValidationResult {
  totalWeightage: number;
  goalCount: number;
  errors: ValidationError[];
  isValid: boolean;
  weightageReached100: boolean;
}

/**
 * Drives the live UI feedback (sticky weightage bar, per-field errors,
 * submit-button disabled tooltip) AND the gating logic that prevents
 * submission of an invalid sheet. The server action runs the same logic
 * via zod (see lib/validations/goal.ts) — never trust the client.
 */
export function useGoalSheetValidation(goals: GoalLike[]): ValidationResult {
  return useMemo(() => {
    const errors: ValidationError[] = [];
    let total = 0;

    if (goals.length === 0) {
      errors.push({ goalIndex: -1, field: "form", message: "Add at least one goal" });
    }
    // Cap counts only non-child goals; shared child goals don't count.
    const primaryCount = goals.filter((g) => !g.parent_goal_id).length;
    if (primaryCount > 8) {
      errors.push({
        goalIndex: -1,
        field: "form",
        message: "Maximum 8 goals allowed (excluding shared child goals)",
      });
    }

    goals.forEach((g, idx) => {
      if (!g.thrust_area_id) {
        errors.push({ goalIndex: idx, field: "thrust_area_id", message: "Pick a thrust area" });
      }
      if (!g.title || g.title.trim().length < 3) {
        errors.push({ goalIndex: idx, field: "title", message: "Goal title is required" });
      }
      if (!g.uom_type) {
        errors.push({ goalIndex: idx, field: "uom_type", message: "Pick a UoM" });
      }

      if (g.uom_type === "timeline") {
        if (!g.target_date) {
          errors.push({
            goalIndex: idx,
            field: "target_date",
            message: "Target date is required",
          });
        }
      } else if (g.uom_type !== "zero") {
        if (g.target == null || Number.isNaN(g.target)) {
          errors.push({ goalIndex: idx, field: "target", message: "Target value is required" });
        }
        if (
          (g.uom_type === "percent_min" || g.uom_type === "percent_max") &&
          g.target != null &&
          (g.target < 0 || g.target > 100)
        ) {
          errors.push({
            goalIndex: idx,
            field: "target",
            message: "Percent target must be 0-100",
          });
        }
      }

      const w = Number(g.weightage);
      if (!w || Number.isNaN(w)) {
        errors.push({ goalIndex: idx, field: "weightage", message: "Weightage is required" });
      } else if (w < 10) {
        errors.push({ goalIndex: idx, field: "weightage", message: "Minimum 10%" });
      } else if (w > 100) {
        errors.push({ goalIndex: idx, field: "weightage", message: "Maximum 100%" });
      } else {
        total += w;
      }
    });

    if (total !== 100 && goals.length > 0) {
      errors.push({
        goalIndex: -1,
        field: "form",
        message: `Total weightage must equal 100% (currently ${total}%)`,
      });
    }

    return {
      totalWeightage: total,
      goalCount: goals.length,
      errors,
      isValid: errors.length === 0,
      weightageReached100: total === 100,
    };
  }, [goals]);
}
