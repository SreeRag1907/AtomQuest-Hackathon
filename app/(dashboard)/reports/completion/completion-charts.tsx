"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { GoalStatusBadge } from "@/components/status-badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { initials } from "@/lib/utils";
import type { GoalSheet, Profile } from "@/types/database";

export function SubmissionFunnel({
  data,
  totalEmployees,
}: {
  data: Array<{ stage: string; count: number }>;
  totalEmployees: number;
}) {
  return (
    <div>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={data} layout="vertical" margin={{ left: 60 }}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
          <XAxis type="number" allowDecimals={false} />
          <YAxis type="category" dataKey="stage" width={140} />
          <Tooltip />
          <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 4, 4]} />
        </BarChart>
      </ResponsiveContainer>
      <div className="mt-2 text-xs text-muted-foreground">
        Out of {totalEmployees} employees in the active cycle.
      </div>
    </div>
  );
}

export function QuarterlyBars({
  data,
}: {
  data: Array<{ quarter: string; done: number; pending: number }>;
}) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart
        data={data.map((d) => ({ ...d, quarter: d.quarter.toUpperCase() }))}
      >
        <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
        <XAxis dataKey="quarter" />
        <YAxis allowDecimals={false} />
        <Tooltip />
        <Legend />
        <Bar dataKey="done" stackId="a" fill="hsl(var(--success))" name="Completed" />
        <Bar dataKey="pending" stackId="a" fill="hsl(var(--warning))" name="Pending" />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function PendingList({
  profiles,
  sheets,
}: {
  profiles: Profile[];
  sheets: GoalSheet[];
}) {
  const sheetByEmp = new Map(sheets.map((s) => [s.employee_id, s]));
  // "Pending submission" = no sheet at all OR sheet still in draft/returned.
  // Submitted/approved/locked employees are excluded.
  const items = profiles
    .map((p) => ({ profile: p, sheet: sheetByEmp.get(p.id) }))
    .filter(({ sheet }) => !sheet || sheet.status === "draft" || sheet.status === "returned");

  if (items.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Everyone has submitted their goals for this cycle. Nice work!
      </p>
    );
  }

  return (
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {items.map(({ profile, sheet }) => (
        <div
          key={profile.id}
          className="flex items-center gap-3 rounded-md border p-2 text-sm"
        >
          <Avatar className="h-8 w-8">
            <AvatarFallback>{initials(profile.full_name)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="truncate font-medium">{profile.full_name}</div>
            <div className="text-xs text-muted-foreground">{profile.department ?? "—"}</div>
          </div>
          {sheet ? (
            <GoalStatusBadge status={sheet.status} />
          ) : (
            <Badge variant="muted">No sheet</Badge>
          )}
        </div>
      ))}
    </div>
  );
}
