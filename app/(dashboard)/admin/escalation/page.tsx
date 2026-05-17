import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/empty-state";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AlertTriangle, ListChecks } from "lucide-react";
import {
  RuleForm,
  RuleEditButton,
  RuleToggle,
  RuleDeleteButton,
} from "./rule-controls";
import { EscalationLogTable } from "./escalation-log-table";
import { RunCheckButton } from "./run-check-button";
import type {
  EscalationLogRow,
  EscalationRule,
  Profile,
} from "@/types/database";

const TRIGGER_LABEL: Record<string, string> = {
  goals_not_submitted: "Goals not submitted",
  goals_not_approved: "Approval overdue",
  checkin_not_done: "Check-in pending",
};

export default async function EscalationPage() {
  const supabase = await createClient();

  const [{ data: rules }, { data: log }] = await Promise.all([
    supabase
      .from("escalation_rules")
      .select("*")
      .order("created_at", { ascending: true }),
    supabase
      .from("escalation_log")
      .select("*")
      .order("fired_at", { ascending: false })
      .limit(200),
  ]);

  const employeeIds = [
    ...new Set((log ?? []).map((r) => (r as EscalationLogRow).employee_id)),
  ];
  const { data: employees } = employeeIds.length
    ? await supabase.from("profiles").select("*").in("id", employeeIds)
    : { data: [] as Profile[] };

  const employeeById = new Map(
    ((employees ?? []) as Profile[]).map((p) => [p.id, p])
  );
  const ruleNameById = new Map(
    ((rules ?? []) as EscalationRule[]).map((r) => [r.id, r.name])
  );

  const openCount = (log ?? []).filter(
    (r) => !(r as EscalationLogRow).resolved_at
  ).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Escalation"
        description="Configure SLA thresholds and review fired escalations. Run checks manually or schedule them via your CI/CD pipeline."
        actions={
          <div className="flex items-center gap-2">
            <RunCheckButton />
            <RuleForm />
          </div>
        }
      />

      <Tabs defaultValue="rules" className="space-y-4">
        <TabsList>
          <TabsTrigger value="rules">
            <ListChecks className="h-3.5 w-3.5" /> Rules
            <Badge variant="muted" className="ml-2">
              {(rules ?? []).length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="log">
            <AlertTriangle className="h-3.5 w-3.5" /> Log
            {openCount > 0 && (
              <Badge variant="warning" className="ml-2">
                {openCount} open
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="rules">
          {(rules ?? []).length === 0 ? (
            <Card className="p-8">
              <EmptyState
                icon={ListChecks}
                title="No escalation rules yet"
                description="Create a rule to start tracking SLA breaches."
              />
            </Card>
          ) : (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Trigger</TableHead>
                    <TableHead className="text-right">Threshold</TableHead>
                    <TableHead>Notify</TableHead>
                    <TableHead>Active</TableHead>
                    <TableHead className="w-44 text-right" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {((rules ?? []) as EscalationRule[]).map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.name}</TableCell>
                      <TableCell>
                        <Badge variant="muted">
                          {TRIGGER_LABEL[r.trigger_event] ?? r.trigger_event}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {r.threshold_days} days
                      </TableCell>
                      <TableCell className="text-xs">
                        <NotifyBadges rule={r} />
                      </TableCell>
                      <TableCell>
                        <RuleToggle rule={r} />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <RuleEditButton rule={r} />
                          <RuleDeleteButton rule={r} />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="log">
          <Card className="p-4">
            <EscalationLogTable
              rows={(log ?? []) as EscalationLogRow[]}
              employees={employeeById}
              ruleNameById={ruleNameById}
            />
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function NotifyBadges({ rule }: { rule: EscalationRule }) {
  const items: string[] = [];
  if (rule.notify_employee) items.push("Employee");
  if (rule.notify_manager) items.push("Manager");
  if (rule.notify_hr) items.push("HR");
  if (items.length === 0) return <span className="text-muted-foreground">—</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {items.map((i) => (
        <Badge key={i} variant="outline" className="text-[10px]">
          {i}
        </Badge>
      ))}
    </div>
  );
}
