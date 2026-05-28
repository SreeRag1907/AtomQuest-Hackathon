"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { phaseLabel } from "@/lib/cycle";
import type { CyclePhase } from "@/types/database";

interface Result {
  ok: boolean;
  error?: string;
}

const PHASES: CyclePhase[] = [
  "not_started",
  "goal_setting",
  "q1",
  "q2",
  "q3",
  "q4_annual",
  "closed",
];

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" } as const;
  const { data } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single<{ role: string }>();
  if (!data || data.role !== "admin") return { error: "Admin only" } as const;
  return { user };
}

const dateOrNull = z
  .string()
  .nullable()
  .refine(
    (v) => v === null || v === "" || !isNaN(Date.parse(v)),
    "Invalid date"
  )
  .transform((v) => (v === "" ? null : v));

const cycleSchema = z
  .object({
    name: z.string().min(2, "Name is required"),
    goal_setting_opens: dateOrNull,
    goal_setting_closes: dateOrNull,
    q1_opens: dateOrNull,
    q1_closes: dateOrNull,
    q2_opens: dateOrNull,
    q2_closes: dateOrNull,
    q3_opens: dateOrNull,
    q3_closes: dateOrNull,
    q4_opens: dateOrNull,
    q4_closes: dateOrNull,
  })
  .superRefine((d, ctx) => {
    const pairs: Array<[string, string | null, string, string | null]> = [
      ["Goal-setting opens", d.goal_setting_opens, "Goal-setting closes", d.goal_setting_closes],
      ["Q1 opens", d.q1_opens, "Q1 closes", d.q1_closes],
      ["Q2 opens", d.q2_opens, "Q2 closes", d.q2_closes],
      ["Q3 opens", d.q3_opens, "Q3 closes", d.q3_closes],
      ["Q4 opens", d.q4_opens, "Q4 closes", d.q4_closes],
    ];
    for (const [openLabel, opens, closeLabel, closes] of pairs) {
      if (opens && closes && new Date(opens) > new Date(closes)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `${openLabel} must be before ${closeLabel}`,
        });
      }
    }
  });

export async function createCycle(input: z.infer<typeof cycleSchema>): Promise<Result> {
  const auth = await requireAdmin();
  if ("error" in auth) return { ok: false, error: auth.error };
  const parsed = cycleSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const supabase = await createClient();
  const { error } = await supabase.from("cycles").insert({
    ...parsed.data,
    current_phase: "not_started",
    is_active: false,
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/cycles");
  return { ok: true };
}

export async function activateCycle(cycleId: string): Promise<Result> {
  const auth = await requireAdmin();
  if ("error" in auth) return { ok: false, error: auth.error };
  const supabase = await createClient();
  // Deactivate all others first
  const { error: deactivateErr } = await supabase
    .from("cycles")
    .update({ is_active: false })
    .neq("id", cycleId);
  if (deactivateErr) return { ok: false, error: deactivateErr.message };
  const { error } = await supabase
    .from("cycles")
    .update({ is_active: true })
    .eq("id", cycleId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/cycles");
  return { ok: true };
}

export async function setPhase(cycleId: string, phase: CyclePhase): Promise<Result> {
  const auth = await requireAdmin();
  if ("error" in auth) return { ok: false, error: auth.error };
  if (!PHASES.includes(phase)) return { ok: false, error: "Invalid phase" };
  const supabase = await createClient();
  const { error } = await supabase
    .from("cycles")
    .update({ current_phase: phase })
    .eq("id", cycleId);
  if (error) return { ok: false, error: error.message };

  // When goal-setting closes (transition to a quarter or to closed), lock all
  // approved sheets in this cycle so goals become immutable for the rest of
  // the year. Approved sheets keep their existing approval metadata.
  if (phase !== "goal_setting" && phase !== "not_started") {
    const now = new Date().toISOString();
    await supabase
      .from("goal_sheets")
      .update({ status: "locked", locked_at: now })
      .eq("cycle_id", cycleId)
      .eq("status", "approved");
  }

  // Notify all users (best effort)
  const { data: users } = await supabase.from("profiles").select("id");
  if (users) {
    const rows = users.map((u) => ({
      user_id: u.id,
      type: "cycle_phase",
      title: `Cycle phase changed`,
      message: `Now in ${phaseLabel(phase)}`,
      link: "/dashboard",
    }));
    await supabase.from("notifications").insert(rows);
  }

  revalidatePath("/admin/cycles");
  revalidatePath("/dashboard");
  revalidatePath("/goals");
  revalidatePath("/check-ins");
  return { ok: true };
}
