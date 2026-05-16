import { notFound } from "next/navigation";
import Link from "next/link";
import { History as HistoryIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { GoalStatusBadge } from "@/components/status-badge";
import { GoalSheetForm } from "@/components/goals/goal-sheet-form";
import { AuditDrawer } from "@/components/audit-drawer";
import { Badge } from "@/components/ui/badge";
import { UOM_LABELS } from "@/lib/validations/goal";
import type { Goal, GoalSheet, ThrustArea, Profile } from "@/types/database";

export default async function GoalSheetDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = await requireProfile();
  const supabase = await createClient();

  const { data: sheet } = await supabase
    .from("goal_sheets")
    .select("*")
    .eq("id", id)
    .single<GoalSheet>();

  if (!sheet) notFound();

  const { data: employee } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", sheet.employee_id)
    .single<Profile>();

  const { data: goals } = await supabase
    .from("goals")
    .select("*")
    .eq("goal_sheet_id", sheet.id)
    .order("display_order");

  const { data: thrustAreas } = await supabase
    .from("thrust_areas")
    .select("*")
    .eq("is_active", true);

  const taById = new Map(
    (thrustAreas ?? ([] as ThrustArea[])).map((t) => [t.id, t])
  );

  const isOwner = sheet.employee_id === profile.id;
  const isEditable = isOwner && ["draft", "returned"].includes(sheet.status);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Goal sheet"
        description={isOwner ? null : `${employee?.full_name}'s goal sheet`}
        actions={
          <AuditDrawer
            entityType={["goal_sheets", "goals"]}
            entityIds={[sheet.id, ...(goals ?? []).map((g) => g.id)]}
            trigger={
              <Button variant="outline" size="sm">
                <HistoryIcon className="h-4 w-4" />
                Audit history
              </Button>
            }
          />
        }
      />

      <Card>
        <CardContent className="grid grid-cols-2 gap-4 p-4 sm:grid-cols-4">
          <Field label="Status">
            <GoalStatusBadge status={sheet.status} />
          </Field>
          <Field label="Submitted">
            {sheet.submitted_at
              ? new Date(sheet.submitted_at).toLocaleDateString()
              : "—"}
          </Field>
          <Field label="Approved">
            {sheet.approved_at
              ? new Date(sheet.approved_at).toLocaleDateString()
              : "—"}
          </Field>
          <Field label="Locked">
            {sheet.locked_at
              ? new Date(sheet.locked_at).toLocaleDateString()
              : "—"}
          </Field>
        </CardContent>
      </Card>

      {sheet.status === "returned" && sheet.return_reason && (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-medium text-destructive">Returned for rework</div>
              <p className="mt-1 text-sm text-foreground">{sheet.return_reason}</p>
            </div>
            {isOwner && (
              <Button asChild>
                <Link href="/goals/new">Edit & resubmit</Link>
              </Button>
            )}
          </div>
        </div>
      )}

      {isEditable ? (
        <GoalSheetForm
          sheetId={sheet.id}
          initialGoals={(goals ?? []) as Goal[]}
          thrustAreas={(thrustAreas ?? []) as ThrustArea[]}
          isReturned={sheet.status === "returned"}
          returnReason={sheet.return_reason}
        />
      ) : (
        <div className="space-y-3">
          {(goals ?? []).map((g, idx) => (
            <Card key={g.id}>
              <CardContent className="space-y-3 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                      {idx + 1}
                    </div>
                    <div>
                      <div className="text-sm font-medium">{g.title}</div>
                      {g.description && (
                        <div className="mt-1 text-sm text-muted-foreground">{g.description}</div>
                      )}
                    </div>
                  </div>
                  <Badge variant="muted" className="shrink-0">
                    {g.weightage}%
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-3 border-t pt-3 text-xs sm:grid-cols-4">
                  <Field label="Thrust area">
                    {g.thrust_area_id ? taById.get(g.thrust_area_id)?.name : "—"}
                  </Field>
                  <Field label="UoM">{UOM_LABELS[g.uom_type as keyof typeof UOM_LABELS]}</Field>
                  <Field label="Target">
                    {g.uom_type === "timeline"
                      ? g.target_date
                        ? new Date(g.target_date).toLocaleDateString()
                        : "—"
                      : g.uom_type === "zero"
                        ? "0"
                        : g.target ?? "—"}
                  </Field>
                  <Field label="Display order">{g.display_order + 1}</Field>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 text-sm">{children}</div>
    </div>
  );
}
