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

interface EntraMetadata {
  full_name?: string;
  name?: string;
  email?: string;
  preferred_username?: string;
  job_title?: string;
  department?: string;
  groups?: string[];
}

export interface EntraSyncResult {
  email: string;
  full_name: string;
  department: string | null;
  role: UserRole;
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
export function buildProfileFromEntra(
  metadata: EntraMetadata,
  existing: Pick<Profile, "email" | "full_name" | "department" | "role"> | null
): EntraSyncResult {
  const email =
    metadata.email ?? metadata.preferred_username ?? existing?.email ?? "";
  const fullName =
    metadata.full_name ?? metadata.name ?? existing?.full_name ?? email;
  const department = metadata.department ?? existing?.department ?? null;
  const claimedRole = resolveEntraRole(metadata.groups);
  const role: UserRole = claimedRole ?? existing?.role ?? "employee";
  return { email, full_name: fullName, department, role };
}
