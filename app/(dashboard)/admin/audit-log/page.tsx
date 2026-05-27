import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AuditTable } from "./audit-table";
import type { AuditLogRow, Profile } from "@/types/database";

const PAGE_SIZE = 100;

export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: Promise<{ entity?: string; action?: string; q?: string; page?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();

  const pageNum = Math.max(0, Number.parseInt(params.page ?? "0", 10) || 0);
  const from = pageNum * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  let query = supabase
    .from("audit_log")
    .select("*, actor:profiles!audit_log_changed_by_fkey(full_name,email)", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (params.entity && params.entity !== "all") {
    query = query.eq("entity_type", params.entity);
  }
  if (params.action && params.action !== "all") {
    query = query.eq("action", params.action);
  }

  const { data: rows, count } = await query;

  const filtered = (rows ?? []).filter(
    (r) =>
      !params.q ||
      r.entity_id.toLowerCase().includes(params.q.toLowerCase()) ||
      r.action.toLowerCase().includes(params.q.toLowerCase())
  );

  const total = count ?? 0;
  const hasNext = (from + (rows?.length ?? 0)) < total;

  function pageHref(offset: number): string {
    const sp = new URLSearchParams();
    if (params.entity && params.entity !== "all") sp.set("entity", params.entity);
    if (params.action && params.action !== "all") sp.set("action", params.action);
    if (params.q) sp.set("q", params.q);
    sp.set("page", String(pageNum + offset));
    return `?${sp.toString()}`;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit log"
        description="Every write to goal sheets, goals, and achievements is captured by Postgres triggers."
      />
      <Card>
        <AuditTable rows={filtered as Array<AuditLogRow & { actor: Profile | null }>} />
      </Card>

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {total === 0
            ? "No entries"
            : `Showing ${from + 1}–${Math.min(from + (rows?.length ?? 0), total)} of ${total}`}
        </span>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" disabled={pageNum === 0} asChild={pageNum > 0}>
            {pageNum > 0 ? <Link href={pageHref(-1)}>Previous</Link> : <span>Previous</span>}
          </Button>
          <span>Page {pageNum + 1}</span>
          <Button variant="ghost" size="sm" disabled={!hasNext} asChild={hasNext}>
            {hasNext ? <Link href={pageHref(1)}>Next</Link> : <span>Next</span>}
          </Button>
        </div>
      </div>
    </div>
  );
}
