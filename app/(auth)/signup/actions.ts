"use server";

import { createServiceClient } from "@/lib/supabase/server";
import type { UserRole } from "@/types/database";

const ROLES: UserRole[] = ["employee", "manager", "admin"];

function devBypass(): boolean {
  return process.env.AUTH_DEV_CREATE_USER_WITHOUT_EMAIL === "true";
}

export async function signUpWithoutAuthEmail(
  email: string,
  password: string,
  fullName: string,
  role: string,
  department: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!devBypass()) {
    return { ok: false, error: "Sign-up email bypass is not enabled on this server." };
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return { ok: false, error: "Server misconfigured" };
  }
  const e = email.trim();
  const name = fullName.trim();
  if (!e || !password || !name) {
    return { ok: false, error: "All required fields are missing" };
  }
  if (password.length < 8) {
    return { ok: false, error: "Password must be at least 8 characters" };
  }
  if (!ROLES.includes(role as UserRole)) {
    return { ok: false, error: "Invalid role" };
  }
  const dept = department.trim();
  const supabase = await createServiceClient();
  const { error } = await supabase.auth.admin.createUser({
    email: e,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: name,
      role: role as UserRole,
      ...(dept ? { department: dept } : {}),
    },
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
