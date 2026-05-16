"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

interface Result {
  ok: boolean;
  error?: string;
}

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
  return { ok: true } as const;
}

export async function createThrustArea(name: string, description: string): Promise<Result> {
  const a = await requireAdmin();
  if ("error" in a) return { ok: false, error: a.error };
  if (!name || name.trim().length < 2) return { ok: false, error: "Name required" };
  const supabase = await createClient();
  const { error } = await supabase
    .from("thrust_areas")
    .insert({ name: name.trim(), description: description.trim() || null });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/thrust-areas");
  return { ok: true };
}

export async function updateThrustArea(
  id: string,
  patch: { name?: string; description?: string | null; is_active?: boolean }
): Promise<Result> {
  const a = await requireAdmin();
  if ("error" in a) return { ok: false, error: a.error };
  const supabase = await createClient();
  const { error } = await supabase.from("thrust_areas").update(patch).eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/thrust-areas");
  return { ok: true };
}
