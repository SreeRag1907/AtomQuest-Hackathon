import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { CycleCreateButton } from "./cycle-create-button";
import { CycleOverviewCard } from "./cycle-overview-card";
import { DemoPhaseHint } from "./demo-phase-hint";
import type { Cycle } from "@/types/database";

export default async function AdminCyclesPage() {
  const supabase = await createClient();
  const { data: cycles } = await supabase.from("cycles").select("*").order("created_at", { ascending: false });

  const list = cycles ?? [];

  return (
    <div className="space-y-8">
      <PageHeader title="Cycles" description="Performance calendar, phases, and demo controls." actions={<CycleCreateButton />} />

      {/* <DemoPhaseHint /> */}

      {list.length === 0 ? (
        <div className="rounded-xl border border-dashed px-6 py-12 text-center text-sm text-muted-foreground">
          No cycles yet. Create one to get started.
        </div>
      ) : (
        <div className="space-y-4">
          {list.map((c: Cycle) => (
            <CycleOverviewCard key={c.id} cycle={c} />
          ))}
        </div>
      )}
    </div>
  );
}
