import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { AuthError } from "@supabase/supabase-js";

const PUBLIC_ROUTES = new Set([
  "/login",
  "/signup",
  "/auth/callback",
  "/auth/error",
  "/update-password",
]);

/** Clear Supabase auth cookies when refresh fails (wrong project URL, revoked user, wiped DB). */
function clearStaleSupabaseCookies(req: NextRequest, res: NextResponse): void {
  const names = req.cookies.getAll().map((c) => c.name);
  names.forEach((name) => {
    // @supabase/ssr stores chunked auth cookies under sb-<projectRef>-...
    if (name.startsWith("sb-")) {
      res.cookies.set(name, "", {
        path: "/",
        maxAge: 0,
        expires: new Date(0),
        sameSite: "lax",
        httpOnly: true,
      });
    }
  });
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  const staleRefresh =
    authError !== null &&
    ((authError as AuthError).code === "refresh_token_not_found" ||
      /refresh_token_not_found/i.test(authError.message));

  /** Treat as logged out and drop invalid cookies so the client stops retrying refresh. */
  const effectiveUser = staleRefresh ? null : user;

  if (staleRefresh) {
    clearStaleSupabaseCookies(request, supabaseResponse);
    if (!process.env.SUPPRESS_AUTH_DEBUG) {
      // One-line hint instead of dumping full AuthApiError stacks to the terminal.
      console.warn(
        "[auth] Cleared stale session cookies (refresh_token_not_found). Sign in again if needed."
      );
    }
  }

  const path = request.nextUrl.pathname;
  const isPublic =
    PUBLIC_ROUTES.has(path) || path.startsWith("/_next") || path === "/favicon.ico";

  if (!effectiveUser && !isPublic) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set("from", path);
    const redirectResponse = NextResponse.redirect(redirectUrl);
    if (staleRefresh) {
      clearStaleSupabaseCookies(request, redirectResponse);
    }
    return redirectResponse;
  }

  if (effectiveUser && (path === "/login" || path === "/signup")) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/dashboard";
    redirectUrl.search = "";
    return NextResponse.redirect(redirectUrl);
  }

  // Block deactivated users before any protected route renders.
  // Cheap follow-up read; skipped on public routes and stale sessions.
  if (effectiveUser && !isPublic) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_active")
      .eq("id", effectiveUser.id)
      .maybeSingle<{ is_active: boolean }>();

    if (profile && profile.is_active === false) {
      await supabase.auth.signOut();
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/auth/error";
      redirectUrl.search = "";
      redirectUrl.searchParams.set("code", "deactivated");
      const res = NextResponse.redirect(redirectUrl);
      clearStaleSupabaseCookies(request, res);
      return res;
    }
  }

  return supabaseResponse;
}
