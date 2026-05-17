import Link from "next/link";
import { ArrowRight, Activity, Building2, ClipboardCheck, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CycleBanner } from "@/components/cycle-banner";
import { phaseLabel } from "@/lib/cycle";
import type { Profile, GoalSheet, Cycle } from "@/types/database";

export async function AdminDashboard({ profile }: { profile: Profile }) {
  const supabase = await createClient();

  const [{ data: cycle }, { data: profiles }, { data: recentAudit }] =
    await Promise.all([
      supabase.from("cycles").select("*").eq("is_active", true).maybeSingle<Cycle>(),
      supabase.from("profiles").select("*"),
      supabase.from("audit_log").select("*").order("created_at", { ascending: false }).limit(8),
    ]);

  // Scope sheet metrics to the active cycle so KPIs are cycle-accurate
  const { data: sheets } = cycle
    ? await supabase.from("goal_sheets").select("*").eq("cycle_id", cycle.id)
    : { data: [] as GoalSheet[] };

  const totalUsers = (profiles ?? []).length;
  const totalSheets = (sheets ?? []).length;
  const submitted = (sheets ?? []).filter((s) => s.status !== "draft").length;
  const approved = (sheets ?? []).filter((s) => ["approved", "locked"].includes(s.status)).length;
  const employees = (profiles ?? []).filter((p) => p.role === "employee").length;
  const submissionRate = employees > 0 ? Math.round((submitted / employees) * 100) : 0;
  const approvalRate = totalSheets > 0 ? Math.round((approved / totalSheets) * 100) : 0;

  const funnel = [
    { stage: "Drafted", count: (sheets ?? []).filter((s) => s.status === "draft").length },
    { stage: "Submitted", count: (sheets ?? []).filter((s) => s.status === "submitted").length },
    { stage: "Approved", count: (sheets ?? []).filter((s) => s.status === "approved").length },
    { stage: "Locked", count: (sheets ?? []).filter((s) => s.status === "locked").length },
    { stage: "Returned", count: (sheets ?? []).filter((s) => s.status === "returned").length },
  ];
  const max = Math.max(...funnel.map((f) => f.count), 1);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          Admin overview, {profile.full_name?.split(" ")[0] || "there"}
        </h1>
        <p className="text-sm text-muted-foreground">Org-wide health, governance, and cycle controls</p>
      </div>

      {cycle && <CycleBanner cycle={cycle} />}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Active users" value={totalUsers} icon={Users} />
        <StatCard label="Submission rate" value={`${submissionRate}%`} icon={ClipboardCheck} accent="warning" />
        <StatCard label="Approval rate" value={`${approvalRate}%`} icon={Building2} accent="success" />
        <StatCard label="Audit entries" value={(recentAudit ?? []).length} icon={Activity} accent="primary" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Cycle controls</CardTitle>
            <Button asChild size="sm" variant="ghost">
              <Link href="/admin/cycles">
                Open <ArrowRight className="ml-1 h-3 w-3" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {cycle ? (
              <>
                <div className="text-sm">{cycle.name}</div>
                <Badge variant="default">{phaseLabel(cycle.current_phase)}</Badge>
                <p className="text-xs text-muted-foreground">
                  Advance the cycle phase from the Cycles settings page.
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">No active cycle.</p>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Goal sheet funnel</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {funnel.map((f) => (
                <li key={f.stage} className="flex items-center gap-3">
                  <div className="w-20 text-sm">{f.stage}</div>
                  <div className="relative h-6 flex-1 rounded-md bg-muted">
                    <div
                      className="h-full rounded-md bg-primary transition-all"
                      style={{ width: `${(f.count / max) * 100}%` }}
                    />
                  </div>
                  <div className="w-8 text-right text-sm tabular-nums">{f.count}</div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Recent audit activity</CardTitle>
          <Button asChild size="sm" variant="ghost">
            <Link href="/admin/audit-log">
              Full log <ArrowRight className="ml-1 h-3 w-3" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {(recentAudit ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">No activity yet.</p>
          ) : (
            <ul className="divide-y">
              {(recentAudit ?? []).map((a) => (
                <li key={a.id} className="flex items-center gap-3 py-2 text-sm">
                  <Badge variant="muted" className="font-mono text-[10px]">
                    {a.entity_type}
                  </Badge>
                  <span className="font-medium">{a.action}</span>
                  <span className="font-mono text-xs text-muted-foreground">
                    {a.entity_id?.slice(0, 8) ?? "—"}…
                  </span>
                  <span className="ml-auto text-xs text-muted-foreground">
                    {new Date(a.created_at).toLocaleString()}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  accent = "primary",
}: {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  accent?: "primary" | "success" | "warning";
}) {
  const colors: Record<string, string> = {
    primary: "bg-primary/10 text-primary",
    success: "bg-success/15 text-success",
    warning: "bg-warning/15 text-warning",
  };
  return (
    <Card>
      <CardContent className="flex items-center justify-between p-5">
        <div>
          <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
          <div className="mt-1 text-2xl font-semibold tabular-nums">{value}</div>
        </div>
        <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${colors[accent]}`}>
          <Icon className="h-4 w-4" />
        </div>
      </CardContent>
    </Card>
  );
}
