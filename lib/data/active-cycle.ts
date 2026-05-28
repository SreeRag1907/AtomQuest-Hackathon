import { unstable_cache, revalidateTag } from "next/cache";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Cycle } from "@/types/database";

/** Org-wide active cycle (RLS: cycles readable by all authenticated roles). Cached 60s. */
export const getActiveCycle = unstable_cache(
  async (): Promise<Cycle | null> => {
    const supabase = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const { data } = await supabase
      .from("cycles")
      .select("*")
      .eq("is_active", true)
      .maybeSingle();
    return (data as Cycle | null) ?? null;
  },
  ["active-cycle"],
  { revalidate: 60, tags: ["active-cycle"] }
);

export function revalidateActiveCycle() {
  revalidateTag("active-cycle");
}
