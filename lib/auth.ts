import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile, UserRole } from "@/types/database";

export async function getSession() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function getProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  // Use maybeSingle so a missing profile row does not surface as an error.
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();
  return (data as Profile | null) ?? null;
}

export async function requireProfile(): Promise<Profile> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  // No session at all → middleware will already have redirected, but keep a
  // safety net for code paths that bypass middleware.
  if (!user) redirect("/login");
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();
  const profile = (data as Profile | null) ?? null;
  // Authenticated session but no profile row → break the historical
  // /login ↔ /dashboard loop with an explicit error page.
  if (!profile) redirect("/auth/error?code=no_profile");
  if (!profile.is_active) redirect("/auth/error?code=deactivated");
  return profile;
}

export async function requireRole(roles: UserRole[]): Promise<Profile> {
  const profile = await requireProfile();
  if (!roles.includes(profile.role)) redirect("/dashboard?reason=insufficient_role");
  return profile;
}
