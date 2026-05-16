"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
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

function KpiCard({
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

export const OrgKpis = { Card: KpiCard };

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

function Donut({ data }: { data: Array<{ name: string; value: number }> }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={2}>
          {data.map((_, idx) => (
            <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}

function UomBars({ data }: { data: Array<{ name: string; value: number }> }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} layout="vertical" margin={{ left: 80 }}>
        <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
        <XAxis type="number" allowDecimals={false} />
        <YAxis type="category" dataKey="name" width={120} fontSize={10} />
        <Tooltip />
        <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 4, 4]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function StackedStatus({
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
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
        <XAxis dataKey="department" fontSize={11} />
        <YAxis allowDecimals={false} />
        <Tooltip />
        <Legend />
        <Bar dataKey="draft" stackId="a" fill="hsl(var(--muted-foreground))" />
        <Bar dataKey="submitted" stackId="a" fill="hsl(var(--warning))" />
        <Bar dataKey="approved" stackId="a" fill="hsl(var(--success))" />
        <Bar dataKey="locked" stackId="a" fill="hsl(var(--primary))" />
        <Bar dataKey="returned" stackId="a" fill="hsl(var(--destructive))" />
      </BarChart>
    </ResponsiveContainer>
  );
}

export const DistributionCharts = { Donut, UomBars, StackedStatus };

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
          <>
            <div key={row.department} className="pr-3 text-sm">
              {row.department}
            </div>
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
          </>
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
