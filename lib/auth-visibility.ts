import type { Profile } from "@/types/database";

/** In-app scope for directory-style data. RLS still allows broad profile reads in demo; we filter here for managers/employees. */
export function profilesVisibleToViewer(all: Profile[], viewer: Profile): Profile[] {
  if (viewer.role === "admin") return all;
  if (viewer.role === "manager") {
    return all.filter((p) => p.id === viewer.id || p.manager_id === viewer.id);
  }
  return all.filter((p) => p.id === viewer.id);
}
