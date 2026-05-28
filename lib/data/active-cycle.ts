import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Cycle } from "@/types/database";

/** Active cycle for the signed-in user (RLS requires authenticated role). */
export const getActiveCycle = cache(async (): Promise<Cycle | null> => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("cycles")
    .select("*")
    .eq("is_active", true)
    .maybeSingle();
  return (data as Cycle | null) ?? null;
});
