"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { formatRelative } from "@/lib/format/date";
import { Loader2, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { saveCheckinComment } from "@/app/(dashboard)/team/actions";
import { computeScore } from "@/lib/scoring";
import { UOM_LABELS } from "@/lib/validations/goal";
import type { Achievement, CheckinComment, Goal, Quarter } from "@/types/database";

const QUARTERS: Quarter[] = ["q1", "q2", "q3", "q4"];

interface Props {
  sheetId: string;
  goals: Goal[];
  achievements: Achievement[];
  comments: CheckinComment[];
  currentManagerId: string;
}

export function CheckinReview({
  sheetId,
  goals,
  achievements,
  comments,
}: Props) {
  return (
    <div className="space-y-4">
      <Tabs defaultValue="q1">
        <TabsList>
          {QUARTERS.map((q) => (
            <TabsTrigger key={q} value={q}>
              {q.toUpperCase()}
            </TabsTrigger>
          ))}
        </TabsList>
        {QUARTERS.map((q) => (
          <TabsContent key={q} value={q} className="space-y-4">
            <QuarterPanel
              quarter={q}
              sheetId={sheetId}
              goals={goals}
              achievements={achievements.filter((a) => a.quarter === q)}
              comments={comments.filter((c) => c.quarter === q)}
            />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

function QuarterPanel({
  quarter,
  sheetId,
  goals,
  achievements,
  comments,
}: {
  quarter: Quarter;
  sheetId: string;
  goals: Goal[];
  achievements: Achievement[];
  comments: CheckinComment[];
}) {
  const router = useRouter();
  const [comment, setComment] = useState("");
  const [isPending, startTransition] = useTransition();

  function submitComment() {
    startTransition(async () => {
      const r = await saveCheckinComment(sheetId, quarter, comment);
      if (!r.ok) {
        toast.error(r.error ?? "Failed");
        return;
      }
      toast.success("Comment saved");
      setComment("");
      router.refresh();
    });
  }

  const hasData = achievements.length > 0;

  return (
    <>
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Goal</TableHead>
              <TableHead>UoM</TableHead>
              <TableHead className="text-right">Target</TableHead>
              <TableHead className="text-right">Actual</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Score</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {goals.map((g) => {
              const a = achievements.find((x) => x.goal_id === g.id) ?? null;
              const score = computeScore(g, a);
              return (
                <TableRow key={g.id}>
                  <TableCell className="font-medium">{g.title}</TableCell>
                  <TableCell className="text-xs">
                    {UOM_LABELS[g.uom_type as keyof typeof UOM_LABELS]}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {g.uom_type === "timeline"
                      ? g.target_date
                        ? new Date(g.target_date).toLocaleDateString()
                        : "—"
                      : g.uom_type === "zero"
                        ? "0"
                        : g.target ?? "—"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {g.uom_type === "timeline"
                      ? a?.actual_date
                        ? new Date(a.actual_date).toLocaleDateString()
                        : "—"
                      : a?.actual_value ?? "—"}
                  </TableCell>
                  <TableCell>
                    {a ? (
                      <Badge
                        variant={
                          a.status === "completed"
                            ? "success"
                            : a.status === "on_track"
                              ? "warning"
                              : "muted"
                        }
                      >
                        {a.status.replace("_", " ")}
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-medium tabular-nums">
                    {score == null ? "—" : `${Math.round(score)}%`}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>

      {!hasData && (
        <div className="text-xs text-muted-foreground">
          No actuals submitted yet for {quarter.toUpperCase()}.
        </div>
      )}

      <Card>
        <CardContent className="space-y-4 p-5">
          <div className="flex items-center gap-2 text-sm font-medium">
            <MessageSquare className="h-4 w-4" />
            Manager comments — {quarter.toUpperCase()}
          </div>
          {comments.length > 0 && (
            <ul className="space-y-2">
              {comments.map((c) => (
                <li
                  key={c.id}
                  className="rounded-md border bg-muted/30 p-3 text-sm"
                >
                  <p>{c.comment}</p>
                  <div className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                    {formatRelative(c.created_at)}
                  </div>
                </li>
              ))}
            </ul>
          )}
          <div className="space-y-2">
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Share structured feedback for this quarter..."
              rows={3}
            />
            <div className="flex justify-end">
              <Button
                size="sm"
                onClick={submitComment}
                disabled={isPending || comment.trim().length < 1}
              >
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Save comment
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
