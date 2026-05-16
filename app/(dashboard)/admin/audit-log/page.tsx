import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { AuditTable } from "./audit-table";
import type { AuditLogRow, Profile } from "@/types/database";

export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: Promise<{ entity?: string; action?: string; q?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("audit_log")
    .select("*, actor:profiles!audit_log_changed_by_fkey(full_name,email)")
    .order("created_at", { ascending: false })
    .limit(500);

  if (params.entity && params.entity !== "all") {
    query = query.eq("entity_type", params.entity);
  }
  if (params.action && params.action !== "all") {
    query = query.eq("action", params.action);
  }

  const { data: rows } = await query;

  const filtered = (rows ?? []).filter((r) =>
    !params.q ||
    r.entity_id.toLowerCase().includes(params.q.toLowerCase()) ||
    r.action.toLowerCase().includes(params.q.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit log"
        description="Every write to goal sheets, goals, and achievements is captured by Postgres triggers."
      />
      <Card>
        <AuditTable rows={filtered as Array<AuditLogRow & { actor: Profile | null }>} />
      </Card>
    </div>
  );
}
