"use client";

import * as React from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Profile } from "@/types/database";

const CHART_COLORS = [
  "hsl(238, 84%, 56%)",
  "hsl(160, 84%, 39%)",
  "hsl(38, 92%, 50%)",
  "hsl(346, 77%, 49%)",
  "hsl(280, 80%, 60%)",
  "hsl(190, 80%, 45%)",
  "hsl(20, 80%, 55%)",
  "hsl(120, 60%, 45%)",
];

const STATUS_COLORS = {
  draft: "hsl(var(--muted-foreground))",
  submitted: "hsl(var(--warning))",
  approved: "hsl(var(--success))",
  locked: "hsl(var(--primary))",
  returned: "hsl(var(--destructive))",
} as const;

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name?: string; value?: number; color?: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border bg-popover px-3 py-2 text-xs shadow-md">
      {label ? <div className="mb-1 font-medium text-foreground">{label}</div> : null}
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2 text-muted-foreground">
          <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
          <span>{p.name}</span>
          <span className="ml-auto font-medium tabular-nums text-foreground">{p.value}</span>
        </div>
      ))}
    </div>
  );
}

function ChartEmpty({ message = "No data yet." }: { message?: string }) {
  return (
    <div className="flex h-[200px] items-center justify-center text-sm text-muted-foreground">
      {message}
    </div>
  );
}

export function KpiCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string | number;
  accent: "primary" | "success" | "warning";
}) {
  const colors: Record<string, string> = {
    primary: "from-primary/10 to-primary/0",
    success: "from-success/10 to-success/0",
    warning: "from-warning/15 to-warning/0",
  };
  return (
    <Card className={`bg-gradient-to-br ${colors[accent]}`}>
      <CardContent className="p-5">
        <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className="mt-1 text-3xl font-semibold tabular-nums">{value}</div>
      </CardContent>
    </Card>
  );
}

export function QoqTrend({
  data,
}: {
  data: Array<{ quarter: string; avg: number }>;
}) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
        <XAxis dataKey="quarter" />
        <YAxis domain={[0, 100]} />
        <Tooltip />
        <Line
          type="monotone"
          dataKey="avg"
          stroke="hsl(var(--primary))"
          strokeWidth={2.5}
          dot={{ r: 5, fill: "hsl(var(--primary))" }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function Donut({ data }: { data: Array<{ name: string; value: number }> }) {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  if (data.length === 0 || total === 0) {
    return <ChartEmpty message="No goals in this cycle yet." />;
  }

  return (
    <div className="space-y-4">
      <div className="relative h-[200px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={52}
              outerRadius={76}
              paddingAngle={2}
            >
              {data.map((_, idx) => (
                <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip content={<ChartTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-semibold tabular-nums">{total}</span>
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">goals</span>
        </div>
      </div>
      <ul className="grid gap-2 sm:grid-cols-2" aria-label="Thrust area legend">
        {data.map((d, idx) => (
          <li key={d.name} className="flex items-center gap-2 text-xs">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ background: CHART_COLORS[idx % CHART_COLORS.length] }}
              aria-hidden
            />
            <span className="min-w-0 flex-1 leading-snug text-muted-foreground">{d.name}</span>
            <span className="shrink-0 font-medium tabular-nums text-foreground">{d.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function UomBars({ data }: { data: Array<{ name: string; value: number }> }) {
  if (data.length === 0) return <ChartEmpty message="No goals in this cycle yet." />;

  const chartHeight = Math.max(200, data.length * 36);

  return (
    <ResponsiveContainer width="100%" height={chartHeight}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 12, left: 4, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" opacity={0.15} horizontal={false} />
        <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
        <YAxis
          type="category"
          dataKey="name"
          width={148}
          tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip content={<ChartTooltip />} cursor={{ fill: "hsl(var(--muted) / 0.25)" }} />
        <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={22}>
          {data.map((_, idx) => (
            <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

const STATUS_LABELS: Record<keyof typeof STATUS_COLORS, string> = {
  draft: "Draft",
  submitted: "Submitted",
  approved: "Approved",
  locked: "Locked",
  returned: "Returned",
};

export function StackedStatus({
  data,
}: {
  data: Array<{
    department: string;
    draft: number;
    submitted: number;
    approved: number;
    locked: number;
    returned: number;
  }>;
}) {
  const hasData = data.some(
    (d) => d.draft + d.submitted + d.approved + d.locked + d.returned > 0
  );
  if (!hasData) return <ChartEmpty message="No goal sheets by department yet." />;

  return (
    <div className="space-y-2">
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.15} vertical={false} />
          <XAxis
            dataKey="department"
            tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
            tickLine={false}
            axisLine={false}
            interval={0}
            angle={-18}
            textAnchor="end"
            height={52}
          />
          <YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={28} />
          <Tooltip content={<ChartTooltip />} />
          {(Object.keys(STATUS_COLORS) as Array<keyof typeof STATUS_COLORS>).map((key) => (
            <Bar
              key={key}
              dataKey={key}
              name={STATUS_LABELS[key]}
              stackId="status"
              fill={STATUS_COLORS[key]}
              maxBarSize={48}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
      <div className="flex flex-wrap justify-center gap-x-4 gap-y-1.5 pt-1">
        {(Object.keys(STATUS_COLORS) as Array<keyof typeof STATUS_COLORS>).map((key) => (
          <span key={key} className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <span
              className="h-2 w-2 rounded-sm"
              style={{ background: STATUS_COLORS[key] }}
              aria-hidden
            />
            {STATUS_LABELS[key]}
          </span>
        ))}
      </div>
    </div>
  );
}

interface HeatmapProps {
  data: Array<{
    department: string;
    cells: Array<{ quarter: string; score: number | null }>;
  }>;
}

export function Heatmap({ data }: HeatmapProps) {
  if (data.length === 0)
    return <div className="text-sm text-muted-foreground">No data yet.</div>;
  const quarters = data[0]?.cells.map((c) => c.quarter) ?? ["Q1", "Q2", "Q3", "Q4"];
  return (
    <div className="overflow-x-auto">
      <div className="inline-grid auto-cols-min gap-1.5"
        style={{ gridTemplateColumns: `auto repeat(${quarters.length}, minmax(96px,1fr))` }}
      >
        <div />
        {quarters.map((q) => (
          <div
            key={q}
            className="text-center text-[10px] font-medium uppercase tracking-wider text-muted-foreground"
          >
            {q}
          </div>
        ))}
        {data.map((row) => (
          <React.Fragment key={row.department}>
            <div className="pr-3 text-sm">{row.department}</div>
            {row.cells.map((cell) => (
              <div
                key={`${row.department}-${cell.quarter}`}
                className={cn(
                  "flex h-12 items-center justify-center rounded-md border text-sm font-medium tabular-nums",
                  cellColor(cell.score)
                )}
                title={cell.score == null ? "No data" : `${Math.round(cell.score)}%`}
              >
                {cell.score == null ? "—" : `${Math.round(cell.score)}%`}
              </div>
            ))}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

function cellColor(score: number | null) {
  if (score == null) return "bg-muted/40 text-muted-foreground";
  if (score >= 90) return "bg-success/30 text-success-foreground";
  if (score >= 75) return "bg-success/15 text-success";
  if (score >= 50) return "bg-warning/15 text-warning";
  return "bg-destructive/10 text-destructive";
}

interface ManagerStat {
  manager: Profile;
  teamSize: number;
  checkinRate: number;
  avgScore: number;
}

export function ManagerEffectiveness({ data }: { data: ManagerStat[] }) {
  const sorted = [...data].sort((a, b) => b.avgScore - a.avgScore);
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Manager</TableHead>
          <TableHead>Team size</TableHead>
          <TableHead>Check-in rate</TableHead>
          <TableHead className="text-right">Avg team score</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sorted.map((m) => (
          <TableRow key={m.manager.id}>
            <TableCell>
              <div className="font-medium">{m.manager.full_name}</div>
              <div className="text-xs text-muted-foreground">{m.manager.department}</div>
            </TableCell>
            <TableCell className="tabular-nums">{m.teamSize}</TableCell>
            <TableCell>
              <Badge variant={m.checkinRate >= 70 ? "success" : "warning"}>
                {m.checkinRate}%
              </Badge>
            </TableCell>
            <TableCell className="text-right">
              <span
                className={cn(
                  "font-semibold tabular-nums",
                  m.avgScore >= 80
                    ? "text-success"
                    : m.avgScore >= 50
                      ? "text-warning"
                      : "text-destructive"
                )}
              >
                {Math.round(m.avgScore)}%
              </span>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
