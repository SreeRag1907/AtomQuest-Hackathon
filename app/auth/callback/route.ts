import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildProfileFromEntra } from "@/lib/auth/entra-sync";
import type { Profile } from "@/types/database";

/**
 * OAuth PKCE callback. Supabase appends `?code=...` (and optional `next=...`)
 * after the IdP redirects back. We exchange it for a session, sync the user's
 * Entra metadata into `profiles`, and bounce them to the dashboard (or wherever
 * `next` says).
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? "/dashboard";
  const errorParam =
    url.searchParams.get("error_description") ?? url.searchParams.get("error");

  const origin = url.origin;

  if (errorParam) {
    return NextResponse.redirect(
      `${origin}/login?from=${encodeURIComponent(next)}&oauth_error=${encodeURIComponent(errorParam)}`
    );
  }

  if (!code) {
    return NextResponse.redirect(`${origin}/login`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(
      `${origin}/login?oauth_error=${encodeURIComponent(error.message)}`
    );
  }

  // Sync Entra claims into our profiles table — keeps role/department fresh.
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    const { data: existing } = await supabase
      .from("profiles")
      .select("email, full_name, department, role")
      .eq("id", user.id)
      .maybeSingle<Pick<Profile, "email" | "full_name" | "department" | "role">>();

    const patch = buildProfileFromEntra(user.user_metadata ?? {}, existing);

    if (existing) {
      await supabase
        .from("profiles")
        .update({
          full_name: patch.full_name,
          department: patch.department,
          role: patch.role,
        })
        .eq("id", user.id);
    } else {
      await supabase.from("profiles").insert({
        id: user.id,
        email: patch.email,
        full_name: patch.full_name,
        department: patch.department,
        role: patch.role,
        is_active: true,
      });
    }
  }

  return NextResponse.redirect(`${origin}${next}`);
}
