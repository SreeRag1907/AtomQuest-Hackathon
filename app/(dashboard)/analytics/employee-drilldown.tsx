"use client";

import { useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { initials } from "@/lib/utils";
import type { Goal, Profile, Quarter } from "@/types/database";

interface EmployeeDatum {
  profile: Profile;
  trend: Array<{ quarter: string; score: number }>;
  goals: Array<{
    goal: Goal;
    qScores: Array<{ quarter: Quarter; score: number | null }>;
  }>;
}

interface Props {
  employees: EmployeeDatum[];
}

export function EmployeeDrilldown({ employees }: Props) {
  const [selectedId, setSelectedId] = useState<string>(employees[0]?.profile.id ?? "");
  const selected = employees.find((e) => e.profile.id === selectedId);

  if (employees.length === 0) {
    return <div className="text-sm text-muted-foreground">No employees yet.</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Avatar className="h-8 w-8">
          <AvatarFallback>{initials(selected?.profile.full_name)}</AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <div className="text-sm font-medium">{selected?.profile.full_name}</div>
          <div className="text-xs text-muted-foreground">{selected?.profile.department}</div>
        </div>
        <Select value={selectedId} onValueChange={setSelectedId}>
          <SelectTrigger className="h-8 w-56">
            <SelectValue placeholder="Choose employee" />
          </SelectTrigger>
          <SelectContent>
            {employees.map((e) => (
              <SelectItem key={e.profile.id} value={e.profile.id}>
                {e.profile.full_name} — {e.profile.department}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <div className="text-xs text-muted-foreground">Quarterly score trend</div>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={selected?.trend ?? []}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
            <XAxis dataKey="quarter" />
            <YAxis domain={[0, 100]} />
            <Tooltip />
            <Line
              type="monotone"
              dataKey="score"
              stroke="hsl(var(--primary))"
              strokeWidth={2.5}
              dot={{ r: 4, fill: "hsl(var(--primary))" }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="space-y-1.5">
        {(selected?.goals ?? []).map(({ goal, qScores }) => (
          <div
            key={goal.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-3 text-sm"
          >
            <div className="min-w-0 flex-1">
              <div className="truncate font-medium">{goal.title}</div>
              <div className="text-xs text-muted-foreground">{goal.weightage}% weight</div>
            </div>
            <div className="flex gap-1.5">
              {qScores.map(({ quarter, score }) => (
                <Badge
                  key={quarter}
                  variant={
                    score == null
                      ? "muted"
                      : score >= 80
                        ? "success"
                        : score >= 50
                          ? "warning"
                          : "destructive"
                  }
                  className="font-mono text-[10px]"
                >
                  {quarter.toUpperCase()}: {score == null ? "—" : `${Math.round(score)}%`}
                </Badge>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
