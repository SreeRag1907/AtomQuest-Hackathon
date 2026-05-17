import Link from "next/link";
import { ArrowRight, ClipboardCheck } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { GoalSheet, Profile } from "@/types/database";

export default async function ApprovalsQueuePage() {
  const me = await requireRole(["manager", "admin"]);
  const supabase = await createClient();

  const teamQuery = supabase.from("profiles").select("id");
  const { data: team } =
    me.role === "admin"
      ? await teamQuery
      : await teamQuery.eq("manager_id", me.id);

  const teamIds = (team ?? []).map((t) => t.id);
  const { data: sheets } = teamIds.length
    ? await supabase
        .from("goal_sheets")
        .select("*")
        .eq("status", "submitted")
        .in("employee_id", teamIds)
        .order("submitted_at", { ascending: true })
    : { data: [] as GoalSheet[] };

  const empIds = (sheets ?? []).map((s) => s.employee_id);
  const { data: employees } = empIds.length
    ? await supabase.from("profiles").select("*").in("id", empIds)
    : { data: [] as Profile[] };
  const empById = new Map((employees ?? []).map((e) => [e.id, e]));

  const goalCounts: Record<string, number> = {};
  if ((sheets ?? []).length) {
    const sheetIds = (sheets ?? []).map((s) => s.id);
    const { data: counts } = await supabase
      .from("goals")
      .select("goal_sheet_id")
      .in("goal_sheet_id", sheetIds);
    (counts ?? []).forEach((row) => {
      goalCounts[row.goal_sheet_id] = (goalCounts[row.goal_sheet_id] ?? 0) + 1;
    });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pending approvals"
        description={`${sheets?.length ?? 0} sheet${sheets?.length === 1 ? "" : "s"} awaiting your review`}
      />

      {(sheets ?? []).length === 0 ? (
        <EmptyState
          icon={ClipboardCheck}
          title="All caught up"
          description="Your team has no pending approvals right now."
        />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead className="text-right">Goals</TableHead>
                <TableHead className="w-32" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {(sheets ?? []).map((s) => {
                const emp = empById.get(s.employee_id);
                return (
                  <TableRow key={s.id}>
                    <TableCell>
                      <div className="font-medium">{emp?.full_name ?? "Unknown"}</div>
                      <div className="text-xs text-muted-foreground">{emp?.email}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="muted">{emp?.department ?? "—"}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {s.submitted_at
                          ? formatDistanceToNow(new Date(s.submitted_at), { addSuffix: true })
                          : "—"}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {s.submitted_at
                          ? new Date(s.submitted_at).toLocaleDateString()
                          : ""}
                      </div>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {goalCounts[s.id] ?? 0}
                    </TableCell>
                    <TableCell>
                      <Button asChild size="sm">
                        <Link href={`/team/${s.employee_id}`}>
                          Review <ArrowRight className="ml-1 h-3 w-3" />
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          </div>
        </Card>
      )}
    </div>
  );
}
