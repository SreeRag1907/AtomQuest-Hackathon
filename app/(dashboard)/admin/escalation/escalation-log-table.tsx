"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { resolveEscalation } from "./actions";
import type { EscalationLogRow, Profile } from "@/types/database";

const TRIGGER_LABEL: Record<string, string> = {
  goals_not_submitted: "Goals not submitted",
  goals_not_approved: "Approval overdue",
  checkin_not_done: "Check-in pending",
};

interface Props {
  rows: EscalationLogRow[];
  employees: Map<string, Profile>;
  ruleNameById: Map<string, string>;
}

export function EscalationLogTable({ rows, employees, ruleNameById }: Props) {
  const [filter, setFilter] = useState<"all" | "open" | "resolved">("open");
  const [search, setSearch] = useState("");

  const filtered = rows.filter((r) => {
    if (filter === "open" && r.resolved_at) return false;
    if (filter === "resolved" && !r.resolved_at) return false;
    if (search.trim()) {
      const emp = employees.get(r.employee_id);
      const haystack = `${emp?.full_name ?? ""} ${TRIGGER_LABEL[r.trigger_event] ?? r.trigger_event}`.toLowerCase();
      if (!haystack.includes(search.toLowerCase())) return false;
    }
    return true;
  });

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-md border bg-muted/40 p-0.5">
          {(["open", "resolved", "all"] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`px-3 py-1 text-xs font-medium capitalize rounded transition-colors ${
                filter === f
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by employee or trigger…"
          className="w-72"
        />
        <div className="ml-auto text-xs text-muted-foreground">
          {filtered.length} {filtered.length === 1 ? "entry" : "entries"}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
          No escalations match this filter. Run a check from the header to populate.
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fired</TableHead>
              <TableHead>Employee</TableHead>
              <TableHead>Trigger</TableHead>
              <TableHead>Rule</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((r) => {
              const emp = employees.get(r.employee_id);
              return (
                <TableRow key={r.id}>
                  <TableCell className="text-xs text-muted-foreground tabular-nums">
                    {format(new Date(r.fired_at), "dd MMM, HH:mm")}
                  </TableCell>
                  <TableCell className="font-medium">
                    {emp?.full_name ?? "Unknown"}
                  </TableCell>
                  <TableCell>
                    <Badge variant="warning">
                      {TRIGGER_LABEL[r.trigger_event] ?? r.trigger_event}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {r.rule_id ? ruleNameById.get(r.rule_id) ?? "—" : "—"}
                  </TableCell>
                  <TableCell>
                    {r.resolved_at ? (
                      <Badge variant="success">Resolved</Badge>
                    ) : (
                      <Badge variant="muted">Open</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {!r.resolved_at && <ResolveButton logId={r.id} />}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </div>
  );
}

function ResolveButton({ logId }: { logId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={isPending}
      onClick={() => {
        const note = prompt("Resolution note (optional):");
        if (note === null) return;
        startTransition(async () => {
          const r = await resolveEscalation(logId, note);
          if (!r.ok) toast.error(r.error ?? "Failed");
          else {
            toast.success("Marked resolved");
            router.refresh();
          }
        });
      }}
    >
      {isPending ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <Check className="h-3.5 w-3.5" />
      )}
      Resolve
    </Button>
  );
}
