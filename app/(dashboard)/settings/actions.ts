"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

interface Result {
  ok: boolean;
  error?: string;
}

export async function updateProfile(input: {
  full_name: string;
  department: string | null;
}): Promise<Result> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated" };
  if (!input.full_name || input.full_name.trim().length < 2) {
    return { ok: false, error: "Name is required" };
  }
  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: input.full_name.trim(),
      department: input.department?.trim() || null,
    })
    .eq("id", user.id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/settings");
  revalidatePath("/dashboard");
  return { ok: true };
}
