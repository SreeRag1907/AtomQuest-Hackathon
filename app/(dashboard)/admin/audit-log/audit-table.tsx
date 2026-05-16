"use client";

import { useMemo, useState } from "react";
import Papa from "papaparse";
import { ChevronDown, ChevronRight, Download, Search } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { AuditLogRow, Profile } from "@/types/database";

type Row = AuditLogRow & { actor: Pick<Profile, "full_name" | "email"> | null };

interface Props {
  rows: Row[];
}

export function AuditTable({ rows }: Props) {
  const [search, setSearch] = useState("");
  const [entity, setEntity] = useState("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const entities = useMemo(() => {
    const set = new Set(rows.map((r) => r.entity_type));
    return Array.from(set);
  }, [rows]);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (entity !== "all" && r.entity_type !== entity) return false;
      if (
        search &&
        !r.entity_id.toLowerCase().includes(search.toLowerCase()) &&
        !r.action.toLowerCase().includes(search.toLowerCase()) &&
        !(r.actor?.full_name ?? "").toLowerCase().includes(search.toLowerCase())
      ) {
        return false;
      }
      return true;
    });
  }, [rows, entity, search]);

  function exportCsv() {
    const csv = Papa.unparse(
      filtered.map((r) => ({
        timestamp: r.created_at,
        entity_type: r.entity_type,
        entity_id: r.entity_id,
        action: r.action,
        changed_by: r.actor?.full_name ?? "",
        reason: r.reason ?? "",
        before: JSON.stringify(r.before_value ?? null),
        after: JSON.stringify(r.after_value ?? null),
      }))
    );
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 border-b p-3">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search id, action, user..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 w-64 pl-7"
          />
        </div>
        <Select value={entity} onValueChange={setEntity}>
          <SelectTrigger className="h-8 w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All entities</SelectItem>
            {entities.map((e) => (
              <SelectItem key={e} value={e}>
                {e}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="ml-auto text-xs text-muted-foreground">
          {filtered.length} entr{filtered.length === 1 ? "y" : "ies"}
        </div>
        <Button variant="outline" size="sm" onClick={exportCsv}>
          <Download className="h-3.5 w-3.5" /> Export CSV
        </Button>
      </div>

      <div className="divide-y">
        {filtered.length === 0 && (
          <div className="px-3 py-12 text-center text-sm text-muted-foreground">
            No audit entries match your filters.
          </div>
        )}
        {filtered.map((r) => {
          const expanded = expandedId === r.id;
          return (
            <div key={r.id}>
              <button
                type="button"
                className="flex w-full items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-muted/40"
                onClick={() => setExpandedId(expanded ? null : r.id)}
              >
                {expanded ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
                <Badge variant="muted" className="font-mono text-[10px]">
                  {r.entity_type}
                </Badge>
                <span className="font-medium text-sm">{r.action}</span>
                <span className="font-mono text-xs text-muted-foreground">
                  {r.entity_id.slice(0, 8)}…
                </span>
                {r.actor && (
                  <span className="text-xs text-muted-foreground">by {r.actor.full_name}</span>
                )}
                <span className="ml-auto text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}
                </span>
              </button>
              {expanded && <DiffView before={r.before_value} after={r.after_value} reason={r.reason} />}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DiffView({
  before,
  after,
  reason,
}: {
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  reason: string | null;
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

  return (
    <div className="border-t bg-muted/30 px-3 py-3">
      {reason && (
        <div className="mb-2 text-xs">
          <span className="text-muted-foreground">Reason: </span>
          <span className="font-medium">{reason}</span>
        </div>
      )}
      {diffs.length === 0 ? (
        <div className="text-xs text-muted-foreground">No field-level diff (insert or delete).</div>
      ) : (
        <table className="w-full text-xs">
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
      )}
    </div>
  );
}

function formatVal(v: unknown): string {
  if (v === null || v === undefined) return "—";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}
