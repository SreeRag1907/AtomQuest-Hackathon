import { z } from "zod";

export const UOM_TYPES = [
  "numeric_min",
  "numeric_max",
  "percent_min",
  "percent_max",
  "timeline",
  "zero",
] as const;

export const UOM_LABELS: Record<(typeof UOM_TYPES)[number], string> = {
  numeric_min: "Numeric — higher is better",
  numeric_max: "Numeric — lower is better",
  percent_min: "Percent — higher is better",
  percent_max: "Percent — lower is better",
  timeline: "Timeline — meet target date",
  zero: "Zero — target is zero",
};

export const goalInputSchema = z
  .object({
    // Client sends `null` for new rows; optional() alone does not accept null
    id: z.string().uuid().nullish(),
    // Child goals (parent_goal_id != null) are received from shared-goal pushes
    // and are excluded from the max-8 count. Optional for non-shared goals.
    parent_goal_id: z.string().uuid().nullish(),
    thrust_area_id: z
      .string()
      .uuid({ message: "Pick a thrust area" })
      .nullable()
      .refine((v) => v != null, { message: "Pick a thrust area" }),
    title: z
      .string()
      .min(3, "Goal title is required")
      .max(200, "Keep it under 200 characters"),
    description: z.string().max(2000).optional().nullable(),
    uom_type: z.enum(UOM_TYPES),
    target: z.number().nullable(),
    target_date: z.string().nullable(),
    weightage: z
      .number({ message: "Weightage is required" })
      .min(10, "Minimum 10%")
      .max(100, "Maximum 100%"),
  })
  .superRefine((g, ctx) => {
    if (g.uom_type === "timeline") {
      if (!g.target_date) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Target date is required for timeline goals",
          path: ["target_date"],
        });
      }
    } else if (g.uom_type === "zero") {
      // target implicitly 0; no extra validation
    } else {
      if (g.target == null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Target value is required",
          path: ["target"],
        });
      }
      if (g.uom_type === "percent_min" || g.uom_type === "percent_max") {
        if (g.target != null && (g.target < 0 || g.target > 100)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Percent target must be between 0 and 100",
            path: ["target"],
          });
        }
      }
    }
  });

export type GoalInput = z.infer<typeof goalInputSchema>;

export const goalSheetInputSchema = z
  .object({
    cycle_id: z.string().uuid(),
    goals: z.array(goalInputSchema).min(1, "At least one goal is required"),
  })
  .superRefine((sheet, ctx) => {
    // The 8-goal cap counts only non-child (primary) goals; shared child goals
    // pushed from another sheet do not count against the employee's own cap.
    const nonChildCount = sheet.goals.filter((g) => !g.parent_goal_id).length;
    if (nonChildCount > 8) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Maximum 8 goals allowed (excluding shared child goals)",
        path: ["goals"],
      });
    }
    const total = sheet.goals.reduce((s, g) => s + (Number(g.weightage) || 0), 0);
    if (total !== 100) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Total weightage must equal 100% (currently ${total}%)`,
        path: ["goals"],
      });
    }
  });

export type GoalSheetInput = z.infer<typeof goalSheetInputSchema>;
