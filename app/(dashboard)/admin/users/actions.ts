"use server";

import { revalidatePath } from "next/cache";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import type { UserRole } from "@/types/database";

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

export async function updateUser(
  userId: string,
  patch: { full_name?: string; role?: UserRole; manager_id?: string | null; department?: string | null; is_active?: boolean }
): Promise<Result> {
  const a = await requireAdmin();
  if ("error" in a) return { ok: false, error: a.error };
  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update(patch).eq("id", userId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/users");
  return { ok: true };
}

export async function inviteUser(email: string, fullName: string, role: UserRole, department: string | null): Promise<Result> {
  const a = await requireAdmin();
  if ("error" in a) return { ok: false, error: a.error };
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return { ok: false, error: "SUPABASE_SERVICE_ROLE_KEY not configured" };
  }
  try {
    const supabase = await createServiceClient();
    const { error } = await supabase.auth.admin.inviteUserByEmail(email, {
      data: { full_name: fullName, role, department },
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/login`,
    });
    if (error) return { ok: false, error: error.message };
    revalidatePath("/admin/users");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed" };
  }
}
