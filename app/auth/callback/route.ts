import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildProfileFromEntra, type EntraMetadata } from "@/lib/auth/entra-sync";
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
  const nextRaw = url.searchParams.get("next") ?? "/dashboard";
  // Open-redirect guard: only honor internal paths.
  const next =
    nextRaw.startsWith("/") && !nextRaw.startsWith("//") ? nextRaw : "/dashboard";
  const errorParam =
    url.searchParams.get("error_description") ?? url.searchParams.get("error");

  const origin = url.origin;

  if (errorParam) {
    return NextResponse.redirect(
      `${origin}/login?from=${encodeURIComponent(next)}&oauth_error=${encodeURIComponent(errorParam)}`
    );
  }

  if (!code) {
    return NextResponse.redirect(`${origin}/login?oauth_error=no_code`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(
      `${origin}/login?oauth_error=exchange_failed`
    );
  }

  // Sync Entra claims into profiles — role, department, optional reporting-line (manager).
  let profileSyncFailed = false;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    try {
      const metadata = coerceEntraMetadata(user.user_metadata);

      const { data: existing } = await supabase
        .from("profiles")
        .select("email, full_name, department, role, manager_id")
        .eq("id", user.id)
        .maybeSingle<
          Pick<Profile, "email" | "full_name" | "department" | "role" | "manager_id">
        >();

      const patch = buildProfileFromEntra(metadata, existing);

      const manager_id = await lookupManagerProfileId(supabase, patch.manager_lookup);

      if (existing) {
        const payload: Record<string, unknown> = {
          full_name: patch.full_name,
          department: patch.department,
          role: patch.role,
        };
        /** Only overwrite reporting line when Entra sends a manager key we resolve */
        if (patch.manager_lookup && manager_id) payload.manager_id = manager_id;

        const { error: upErr } = await supabase
          .from("profiles")
          .update(payload)
          .eq("id", user.id);
        if (upErr) profileSyncFailed = true;
      } else {
        const { error: insErr } = await supabase.from("profiles").insert({
          id: user.id,
          email: patch.email,
          full_name: patch.full_name,
          department: patch.department,
          role: patch.role,
          manager_id,
          is_active: true,
        });
        if (insErr) profileSyncFailed = true;
      }
    } catch {
      profileSyncFailed = true;
    }
  }

  if (profileSyncFailed) {
    return NextResponse.redirect(
      `${origin}/login?oauth_error=profile_sync_failed`
    );
  }

  return NextResponse.redirect(`${origin}${next}`);
}

/** Flatten common Supabase + Entra nesting so custom claims are visible alongside root keys */
function coerceEntraMetadata(raw: Record<string, unknown> | undefined): EntraMetadata {
  const root = raw ?? {};
  const cc = root.custom_claims;
  let nested: Record<string, unknown> = {};
  if (cc && typeof cc === "object" && !Array.isArray(cc))
    nested = cc as Record<string, unknown>;

  return { ...root, ...nested } as EntraMetadata;
}

type SupabaseServer = Awaited<ReturnType<typeof createClient>>;

async function lookupManagerProfileId(
  supabase: SupabaseServer,
  lookup: string | null
): Promise<string | null> {
  if (!lookup?.trim()) return null;
  const raw = lookup.trim();
  const variants = [...new Set([raw, raw.toLowerCase()])];
  for (const variant of variants) {
    const { data } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", variant)
      .maybeSingle<{ id: string }>();
    if (data?.id) return data.id;
  }
  return null;
}
