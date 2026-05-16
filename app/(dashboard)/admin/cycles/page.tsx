import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CycleControls } from "./cycle-controls";
import { CycleCreateButton } from "./cycle-create-button";
import { phaseLabel } from "@/lib/cycle";
import type { Cycle } from "@/types/database";

export default async function AdminCyclesPage() {
  const supabase = await createClient();
  const { data: cycles } = await supabase
    .from("cycles")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cycles"
        description="Manage performance cycles and demo phase advancement."
        actions={<CycleCreateButton />}
      />

      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="space-y-1 p-4 text-sm">
          <div className="font-medium">Demo lever — manual phase advance</div>
          <div className="text-xs text-muted-foreground">
            In production, a Postgres scheduled function (pg_cron) would advance phases on
            cycle dates. For demos, use the buttons below to walk judges through goal setting →
            Q1 → Q2 → Q3 → Q4 → closed.
          </div>
        </CardContent>
      </Card>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Phase</TableHead>
              <TableHead>Goal setting</TableHead>
              <TableHead>Q1</TableHead>
              <TableHead>Q2</TableHead>
              <TableHead>Q3</TableHead>
              <TableHead>Q4</TableHead>
              <TableHead className="w-32" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {(cycles ?? []).map((c: Cycle) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">{c.name}</TableCell>
                <TableCell>
                  {c.is_active ? (
                    <Badge variant="success">Active</Badge>
                  ) : (
                    <Badge variant="muted">Inactive</Badge>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{phaseLabel(c.current_phase)}</Badge>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {fmtRange(c.goal_setting_opens, c.goal_setting_closes)}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {fmtRange(c.q1_opens, c.q1_closes)}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {fmtRange(c.q2_opens, c.q2_closes)}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {fmtRange(c.q3_opens, c.q3_closes)}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {fmtRange(c.q4_opens, c.q4_closes)}
                </TableCell>
                <TableCell>
                  <CycleControls cycle={c} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

function fmtRange(open: string | null, close: string | null) {
  if (!open && !close) return "—";
  const fmt = (d: string | null) =>
    d ? new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "—";
  return `${fmt(open)} → ${fmt(close)}`;
}
