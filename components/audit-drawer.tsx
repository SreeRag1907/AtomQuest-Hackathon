"use client";

import { useEffect, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { createClient } from "@/lib/supabase/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { AuditLogRow, Profile } from "@/types/database";

interface Props {
  entityType: string | string[];
  entityIds: string[];
  trigger: React.ReactNode;
  title?: string;
}

type Row = AuditLogRow & { actor?: Pick<Profile, "full_name" | "email"> | null };

export function AuditDrawer({ entityType, entityIds, trigger, title = "Audit history" }: Props) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    async function load() {
      const supabase = createClient();
      const types = Array.isArray(entityType) ? entityType : [entityType];
      const { data } = await supabase
        .from("audit_log")
        .select("*, actor:profiles!audit_log_changed_by_fkey(full_name,email)")
        .in("entity_type", types)
        .in("entity_id", entityIds)
        .order("created_at", { ascending: false })
        .limit(200);
      if (!cancelled) setRows((data as Row[] | null) ?? []);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [open, entityType, entityIds]);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>{trigger}</SheetTrigger>
      <SheetContent className="w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
          <p className="text-xs text-muted-foreground">
            Captured automatically by Postgres triggers — never bypassed in code.
          </p>
        </SheetHeader>
        <ScrollArea className="mt-4 h-[calc(100vh-7rem)] pr-2">
          {rows === null ? (
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : rows.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              No audit entries yet.
            </div>
          ) : (
            <ul className="space-y-2">
              {rows.map((row) => {
                const expanded = expandedId === row.id;
                return (
                  <li key={row.id} className="rounded-md border bg-card">
                    <button
                      type="button"
                      className="flex w-full items-start gap-2 px-3 py-2 text-left"
                      onClick={() => setExpandedId(expanded ? null : row.id)}
                    >
                      {expanded ? (
                        <ChevronDown className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2 text-sm">
                          <Badge variant="muted" className="font-mono text-[10px]">
                            {row.entity_type}
                          </Badge>
                          <span className="font-medium">{row.action}</span>
                          {row.actor && (
                            <span className="text-xs text-muted-foreground">
                              by {row.actor.full_name}
                            </span>
                          )}
                        </div>
                        <div className="mt-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                          {formatDistanceToNow(new Date(row.created_at), { addSuffix: true })}
                          {row.reason && ` · ${row.reason}`}
                        </div>
                      </div>
                    </button>
                    {expanded && (
                      <DiffView before={row.before_value} after={row.after_value} />
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

function DiffView({
  before,
  after,
}: {
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
}) {
  const keys = new Set<string>();
  if (before) Object.keys(before).forEach((k) => keys.add(k));
  if (after) Object.keys(after).forEach((k) => keys.add(k));
  const SKIP = new Set(["id", "created_at", "updated_at"]);
  const diffs = Array.from(keys)
    .filter((k) => !SKIP.has(k))
    .map((k) => ({
      key: k,
      before: before?.[k],
      after: after?.[k],
      changed: JSON.stringify(before?.[k]) !== JSON.stringify(after?.[k]),
    }))
    .filter((d) => d.changed);

  if (diffs.length === 0) {
    return (
      <div className="border-t px-3 py-2 text-xs text-muted-foreground">
        No field-level diff (insert or delete).
      </div>
    );
  }

  return (
    <div className="border-t bg-muted/30 px-3 py-2 text-xs">
      <table className="w-full">
        <thead>
          <tr className="text-left text-[10px] uppercase tracking-wider text-muted-foreground">
            <th className="w-1/4 pb-1.5">Field</th>
            <th className="w-1/3 pb-1.5">Before</th>
            <th className="w-1/3 pb-1.5">After</th>
          </tr>
        </thead>
        <tbody className="font-mono text-[11px]">
          {diffs.map((d) => (
            <tr key={d.key} className="border-t border-border/50">
              <td className="py-1 pr-2 align-top">{d.key}</td>
              <td className={cn("py-1 pr-2 align-top text-muted-foreground")}>
                {formatVal(d.before)}
              </td>
              <td className="py-1 align-top text-foreground">{formatVal(d.after)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function formatVal(v: unknown): string {
  if (v === null || v === undefined) return "—";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}
