import type { Profile, UserRole } from "@/types/database";

/**
 * Microsoft Entra (Azure AD) → AtomQuest profile mapper.
 *
 * Reads claims that Supabase exposes on the `user.user_metadata` after a
 * successful OAuth sign-in and returns a partial profile suitable for an
 * upsert. Conservatively keeps existing values when claims are missing.
 *
 * Group → role mapping is configured via the env vars below so the mapping
 * isn't hard-coded into the binary:
 *   AZURE_GROUP_ADMIN
 *   AZURE_GROUP_MANAGER
 *   AZURE_GROUP_EMPLOYEE
 *
 * Set these to comma-separated Azure Group Object IDs once you've created
 * groups in Entra and wired them in the app registration's "Token
 * configuration" → "Optional claim: groups".
 */

export interface EntraMetadata {
  full_name?: string;
  name?: string;
  email?: string;
  preferred_username?: string;
  job_title?: string;
  department?: string;
  /** Entra Group Object IDs; may be missing unless optional `groups` claim is enabled. */
  groups?: unknown;
  /**
   * If you map manager mail / UPN into the token (claims mapping, schema extension,
   * or Entra SSO attribute), put it here so `/auth/callback` can resolve profiles.manager_id.
   */
  manager_email?: string;
  manager_upn?: string;
  reports_to_mail?: string;
}

export interface EntraSyncResult {
  email: string;
  full_name: string;
  department: string | null;
  role: UserRole;
  /** Manager match key (email-ish); resolved to FK in callback via profiles.email */
  manager_lookup: string | null;
}

const ROLE_PRECEDENCE: UserRole[] = ["admin", "manager", "employee"];

function parseGroupList(envValue: string | undefined): Set<string> {
  if (!envValue) return new Set();
  return new Set(
    envValue
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
  );
}

/** Normalise Entra/WIF `groups` claim (array, JSON string, or single string). */
export function normaliseGroupsClaim(groups: unknown): string[] {
  if (groups == null) return [];
  if (Array.isArray(groups)) return groups.filter((x): x is string => typeof x === "string");
  if (typeof groups === "string") {
    try {
      const parsed = JSON.parse(groups) as unknown;
      if (Array.isArray(parsed))
        return parsed.filter((x): x is string => typeof x === "string");
      return [groups];
    } catch {
      return [groups];
    }
  }
  return [];
}

export function resolveEntraRole(groups: string[] | undefined): UserRole | null {
  const claimed = new Set(groups ?? []);
  const adminGroups = parseGroupList(process.env.AZURE_GROUP_ADMIN);
  const managerGroups = parseGroupList(process.env.AZURE_GROUP_MANAGER);
  const employeeGroups = parseGroupList(process.env.AZURE_GROUP_EMPLOYEE);

  for (const role of ROLE_PRECEDENCE) {
    const set =
      role === "admin"
        ? adminGroups
        : role === "manager"
          ? managerGroups
          : employeeGroups;
    if ([...claimed].some((g) => set.has(g))) return role;
  }
  return null;
}

/**
 * Build a profile patch from Entra claims for an upsert into `profiles`.
 * Falls back to `existing` for any field the IdP didn't supply.
 */
function normalizeManagerLookup(meta: EntraMetadata): string | null {
  const raw =
    meta.manager_email?.trim() ||
    meta.manager_upn?.trim() ||
    meta.reports_to_mail?.trim();
  if (!raw) return null;
  return raw.replace(/^mailto:/i, "").trim();
}

export function buildProfileFromEntra(
  metadata: EntraMetadata,
  existing:
    | Pick<Profile, "email" | "full_name" | "department" | "role">
    | null
): EntraSyncResult {
  const groups = normaliseGroupsClaim(metadata.groups);
  const email =
    metadata.email ?? metadata.preferred_username ?? existing?.email ?? "";
  const fullName =
    metadata.full_name ?? metadata.name ?? existing?.full_name ?? email;
  const department = metadata.department ?? existing?.department ?? null;
  const claimedRole = resolveEntraRole(groups);
  const role: UserRole = claimedRole ?? existing?.role ?? "employee";
  return {
    email,
    full_name: fullName,
    department,
    role,
    manager_lookup: normalizeManagerLookup(metadata),
  };
}
