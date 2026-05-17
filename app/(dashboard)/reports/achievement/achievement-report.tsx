"use client";

import { useMemo, useState } from "react";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { ChevronDown, Download, FileSpreadsheet, FileText, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { computeScore } from "@/lib/scoring";
import { UOM_LABELS } from "@/lib/validations/goal";
import { cn } from "@/lib/utils";
import type {
  Achievement,
  Cycle,
  Goal,
  GoalSheet,
  Profile,
  Quarter,
  ThrustArea,
} from "@/types/database";

interface Props {
  cycles: Cycle[];
  activeCycleId: string | null;
  sheets: GoalSheet[];
  goals: Goal[];
  achievements: Achievement[];
  employees: Profile[];
  thrustAreas: ThrustArea[];
}

const QUARTERS: Quarter[] = ["q1", "q2", "q3", "q4"];

export function AchievementReport({
  cycles,
  activeCycleId,
  sheets,
  goals,
  achievements,
  employees,
  thrustAreas,
}: Props) {
  const [cycleId, setCycleId] = useState<string>(activeCycleId ?? cycles[0]?.id ?? "");
  const [department, setDepartment] = useState("all");
  const [thrustAreaId, setThrustAreaId] = useState("all");
  const [search, setSearch] = useState("");

  const departments = useMemo(() => {
    const set = new Set(employees.map((e) => e.department).filter(Boolean) as string[]);
    return Array.from(set).sort();
  }, [employees]);

  const empById = useMemo(() => new Map(employees.map((e) => [e.id, e])), [employees]);
  const sheetById = useMemo(() => new Map(sheets.map((s) => [s.id, s])), [sheets]);
  const taById = useMemo(() => new Map(thrustAreas.map((t) => [t.id, t])), [thrustAreas]);

  const rows = useMemo(() => {
    return goals
      .filter((g) => {
        const sheet = sheetById.get(g.goal_sheet_id);
        if (!sheet) return false;
        if (cycleId && sheet.cycle_id !== cycleId) return false;
        const emp = empById.get(sheet.employee_id);
        if (department !== "all" && emp?.department !== department) return false;
        if (thrustAreaId !== "all" && g.thrust_area_id !== thrustAreaId) return false;
        if (
          search &&
          !g.title.toLowerCase().includes(search.toLowerCase()) &&
          !(emp?.full_name ?? "").toLowerCase().includes(search.toLowerCase())
        ) {
          return false;
        }
        return true;
      })
      .map((g) => {
        const sheet = sheetById.get(g.goal_sheet_id)!;
        const emp = empById.get(sheet.employee_id);
        const qActuals: Record<Quarter, Achievement | undefined> = {
          q1: achievements.find((a) => a.goal_id === g.id && a.quarter === "q1"),
          q2: achievements.find((a) => a.goal_id === g.id && a.quarter === "q2"),
          q3: achievements.find((a) => a.goal_id === g.id && a.quarter === "q3"),
          q4: achievements.find((a) => a.goal_id === g.id && a.quarter === "q4"),
        };
        const scores: Record<Quarter, number | null> = {
          q1: computeScore(g, qActuals.q1 ?? null),
          q2: computeScore(g, qActuals.q2 ?? null),
          q3: computeScore(g, qActuals.q3 ?? null),
          q4: computeScore(g, qActuals.q4 ?? null),
        };
        const numericScores = QUARTERS.map((q) => scores[q]).filter(
          (s): s is number => s != null
        );
        const annualScore =
          numericScores.length > 0
            ? numericScores.reduce((a, b) => a + b, 0) / numericScores.length
            : null;
        return {
          goal: g,
          sheet,
          emp,
          actuals: qActuals,
          scores,
          annualScore,
        };
      });
  }, [goals, sheetById, empById, achievements, cycleId, department, thrustAreaId, search]);

  function exportRows() {
    return rows.map((r) => ({
      Employee: r.emp?.full_name ?? "",
      Department: r.emp?.department ?? "",
      Goal: r.goal.title,
      "Thrust area": r.goal.thrust_area_id
        ? taById.get(r.goal.thrust_area_id)?.name ?? ""
        : "",
      UoM: UOM_LABELS[r.goal.uom_type as keyof typeof UOM_LABELS] ?? r.goal.uom_type,
      Target:
        r.goal.uom_type === "timeline"
          ? r.goal.target_date ?? ""
          : r.goal.target ?? "",
      "Weightage %": r.goal.weightage,
      "Q1 actual": r.actuals.q1?.actual_value ?? r.actuals.q1?.actual_date ?? "",
      "Q1 score %": r.scores.q1 != null ? Number(r.scores.q1.toFixed(1)) : "",
      "Q2 actual": r.actuals.q2?.actual_value ?? r.actuals.q2?.actual_date ?? "",
      "Q2 score %": r.scores.q2 != null ? Number(r.scores.q2.toFixed(1)) : "",
      "Q3 actual": r.actuals.q3?.actual_value ?? r.actuals.q3?.actual_date ?? "",
      "Q3 score %": r.scores.q3 != null ? Number(r.scores.q3.toFixed(1)) : "",
      "Q4 actual": r.actuals.q4?.actual_value ?? r.actuals.q4?.actual_date ?? "",
      "Q4 score %": r.scores.q4 != null ? Number(r.scores.q4.toFixed(1)) : "",
      "Annual score %":
        r.annualScore != null ? Number(r.annualScore.toFixed(1)) : "",
    }));
  }

  function exportCsv() {
    const csv = Papa.unparse(exportRows());
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `achievement-report-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function exportXlsx() {
    const data = exportRows();
    const ws = XLSX.utils.json_to_sheet(data);
    // Auto-fit columns roughly based on content length
    const colWidths = Object.keys(data[0] ?? {}).map((key) => {
      const headerLen = key.length;
      const maxCellLen = data.reduce((max, row) => {
        const v = (row as Record<string, unknown>)[key];
        return Math.max(max, String(v ?? "").length);
      }, 0);
      return { wch: Math.min(Math.max(headerLen, maxCellLen) + 2, 40) };
    });
    ws["!cols"] = colWidths;
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Achievement");
    XLSX.writeFile(
      wb,
      `achievement-report-${new Date().toISOString().slice(0, 10)}.xlsx`
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 border-b p-3">
        {cycles.length > 0 ? (
          <Select value={cycleId} onValueChange={setCycleId}>
            <SelectTrigger className="h-8 w-40">
              <SelectValue placeholder="Cycle" />
            </SelectTrigger>
            <SelectContent>
              {cycles.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <span className="text-xs text-muted-foreground">No cycles yet</span>
        )}
        <Select value={department} onValueChange={setDepartment}>
          <SelectTrigger className="h-8 w-40">
            <SelectValue placeholder="Department" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All departments</SelectItem>
            {departments.map((d) => (
              <SelectItem key={d} value={d}>
                {d}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={thrustAreaId} onValueChange={setThrustAreaId}>
          <SelectTrigger className="h-8 w-44">
            <SelectValue placeholder="Thrust area" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All thrust areas</SelectItem>
            {thrustAreas.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                {t.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="relative">
          <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search goal or person..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 w-56 pl-7"
          />
        </div>
        <div className="ml-auto text-xs text-muted-foreground">
          {rows.length} row{rows.length === 1 ? "" : "s"}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <Download className="h-3.5 w-3.5" />
              Export
              <ChevronDown className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={exportCsv}>
              <FileText className="mr-2 h-4 w-4" />
              CSV (.csv)
            </DropdownMenuItem>
            <DropdownMenuItem onClick={exportXlsx}>
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              Excel (.xlsx)
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Employee</TableHead>
              <TableHead>Goal</TableHead>
              <TableHead>Thrust</TableHead>
              <TableHead>UoM</TableHead>
              <TableHead className="text-right">Target</TableHead>
              <TableHead className="text-right">Wt</TableHead>
              {QUARTERS.map((q) => (
                <TableHead key={q} className="text-right">
                  {q.toUpperCase()}
                </TableHead>
              ))}
              <TableHead className="text-right">Annual</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={6 + QUARTERS.length + 1} className="py-8 text-center text-sm text-muted-foreground">
                  No goals match the selected filters.
                </TableCell>
              </TableRow>
            )}
            {rows.map((r) => (
              <TableRow key={r.goal.id}>
                <TableCell className="text-sm">
                  <div className="font-medium">{r.emp?.full_name}</div>
                  <div className="text-xs text-muted-foreground">{r.emp?.department}</div>
                </TableCell>
                <TableCell className="max-w-md text-sm">{r.goal.title}</TableCell>
                <TableCell className="text-xs">
                  {r.goal.thrust_area_id ? taById.get(r.goal.thrust_area_id)?.name : "—"}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {UOM_LABELS[r.goal.uom_type as keyof typeof UOM_LABELS] ?? r.goal.uom_type ?? "—"}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {r.goal.uom_type === "timeline"
                    ? r.goal.target_date
                      ? new Date(r.goal.target_date).toLocaleDateString()
                      : "—"
                    : r.goal.uom_type === "zero"
                      ? "0"
                      : r.goal.target ?? "—"}
                </TableCell>
                <TableCell className="text-right tabular-nums">{r.goal.weightage}%</TableCell>
                {QUARTERS.map((q) => (
                  <TableCell key={q} className="text-right">
                    <ScoreCell score={r.scores[q]} />
                  </TableCell>
                ))}
                <TableCell className="text-right">
                  {r.annualScore == null ? (
                    <span className="text-xs text-muted-foreground">—</span>
                  ) : (
                    <Badge variant={badgeVariant(r.annualScore)}>{Math.round(r.annualScore)}%</Badge>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function ScoreCell({ score }: { score: number | null }) {
  if (score == null) return <span className="text-xs text-muted-foreground">—</span>;
  return (
    <span
      className={cn(
        "tabular-nums",
        score >= 80 ? "text-success" : score >= 50 ? "text-warning" : "text-destructive"
      )}
    >
      {Math.round(score)}%
    </span>
  );
}

function badgeVariant(score: number): "success" | "warning" | "destructive" {
  if (score >= 80) return "success";
  if (score >= 50) return "warning";
  return "destructive";
}
