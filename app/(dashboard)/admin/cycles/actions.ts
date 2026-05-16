"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
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

const cycleSchema = z.object({
  name: z.string().min(2, "Name is required"),
  goal_setting_opens: z.string().nullable(),
  goal_setting_closes: z.string().nullable(),
  q1_opens: z.string().nullable(),
  q1_closes: z.string().nullable(),
  q2_opens: z.string().nullable(),
  q2_closes: z.string().nullable(),
  q3_opens: z.string().nullable(),
  q3_closes: z.string().nullable(),
  q4_opens: z.string().nullable(),
  q4_closes: z.string().nullable(),
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

  // Notify all users (best effort)
  const { data: users } = await supabase.from("profiles").select("id");
  if (users) {
    const rows = users.map((u) => ({
      user_id: u.id,
      type: "cycle_phase",
      title: `Cycle phase changed`,
      message: `Now in ${phase.replace("_", " ")}`,
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
