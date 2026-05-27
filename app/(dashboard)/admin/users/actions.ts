"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import type { UserRole } from "@/types/database";

interface Result {
  ok: boolean;
  error?: string;
  /** Set when AUTH_DEV_CREATE_USER_WITHOUT_EMAIL creates a user (no invite email). */
  devPassword?: string;
}

function devCreateWithoutEmail(): boolean {
  return process.env.AUTH_DEV_CREATE_USER_WITHOUT_EMAIL === "true";
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
  return { ok: true, userId: user.id } as const;
}

export async function updateUser(
  userId: string,
  patch: { full_name?: string; role?: UserRole; manager_id?: string | null; department?: string | null; is_active?: boolean }
): Promise<Result> {
  const a = await requireAdmin();
  if ("error" in a) return { ok: false, error: a.error };

  // Self-lockout guard: an admin must not be able to demote themselves out of
  // admin or deactivate their own account in a single click. They can ask a
  // peer admin to make the change.
  if (userId === a.userId) {
    if (patch.role !== undefined && patch.role !== "admin") {
      return { ok: false, error: "You can't change your own role away from admin. Ask another admin." };
    }
    if (patch.is_active === false) {
      return { ok: false, error: "You can't deactivate your own account. Ask another admin." };
    }
  }

  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update(patch).eq("id", userId);
  if (error) {
    // Friendly mapping for common cases
    const msg = error.message?.toLowerCase() ?? "";
    if (msg.includes("duplicate") && msg.includes("email")) {
      return { ok: false, error: "Email already in use." };
    }
    return { ok: false, error: error.message };
  }
  revalidatePath("/admin/users");
  return { ok: true };
}

export async function inviteUser(
  email: string,
  fullName: string,
  role: UserRole,
  department: string | null,
  managerId: string | null = null
): Promise<Result> {
  const a = await requireAdmin();
  if ("error" in a) return { ok: false, error: a.error };
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return { ok: false, error: "SUPABASE_SERVICE_ROLE_KEY not configured" };
  }

  const cleanEmail = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    return { ok: false, error: "Please enter a valid email address." };
  }

  try {
    const adminClient = await createServiceClient();

    // Friendlier "already in use" message — the Supabase error often surfaces
    // as a generic 422 otherwise.
    const { data: existing } = await adminClient
      .from("profiles")
      .select("id")
      .eq("email", cleanEmail)
      .maybeSingle();
    if (existing) {
      return { ok: false, error: "Email already in use." };
    }

    const metadata = {
      full_name: fullName,
      role,
      ...(department ? { department } : {}),
      ...(managerId ? { manager_id: managerId } : {}),
      _provisioned: true,
    };

    if (devCreateWithoutEmail()) {
      const password =
        process.env.AUTH_DEV_NEW_USER_PASSWORD?.trim() ||
        randomBytes(12).toString("base64url");
      const { error } = await adminClient.auth.admin.createUser({
        email: cleanEmail,
        password,
        email_confirm: true,
        user_metadata: metadata,
      });
      if (error) return { ok: false, error: friendlyAuthError(error.message) };
      revalidatePath("/admin/users");
      return { ok: true, devPassword: password };
    }
    const { error } = await adminClient.auth.admin.inviteUserByEmail(cleanEmail, {
      data: metadata,
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/login`,
    });
    if (error) return { ok: false, error: friendlyAuthError(error.message) };
    revalidatePath("/admin/users");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed" };
  }
}

function friendlyAuthError(msg: string): string {
  const lower = msg.toLowerCase();
  if (lower.includes("already") && (lower.includes("registered") || lower.includes("exists"))) {
    return "Email already in use.";
  }
  return msg;
}
