"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Save, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { saveDraft, submitForApproval } from "@/app/(dashboard)/goals/actions";
import type { GoalDraftInput } from "@/app/(dashboard)/goals/actions";
import { useGoalSheetValidation } from "@/hooks/use-goal-sheet-validation";
import type { Goal, ThrustArea, UomType } from "@/types/database";
import { GoalCard } from "./goal-card";
import { WeightageBar } from "./weightage-bar";
import type { ShareRecipient } from "./share-goal-dialog";

export interface GoalRow {
  _key: string;
  id?: string;
  thrust_area_id: string | null;
  title: string;
  description: string | null;
  uom_type: UomType;
  target: number | null;
  target_date: string | null;
  weightage: number | null;
  parent_goal_id?: string | null;
  parent_owner_name?: string | null;
}

interface Props {
  sheetId: string;
  initialGoals: Goal[];
  thrustAreas: ThrustArea[];
  isReturned?: boolean;
  returnReason?: string | null;
  canShare?: boolean;
  shareCandidates?: ShareRecipient[];
  recipientsByGoalId?: Record<string, string[]>;
  parentOwnerByGoalId?: Record<string, string>;
  /** When set, replaces default employee `saveDraft` (e.g. manager assigning to a report). */
  saveDraftAction?: (
    sheetId: string,
    goals: GoalDraftInput[]
  ) => Promise<{ ok: boolean; error?: string }>;
  /** Hide submit — e.g. manager assigns draft; employee submits from My goals. */
  hideSubmit?: boolean;
  /** Shown under the weightage bar when `hideSubmit` is true */
  assignHint?: string;
}

const MAX_GOALS = 8;

function newRow(): GoalRow {
  return {
    _key: crypto.randomUUID(),
    thrust_area_id: null,
    title: "",
    description: "",
    uom_type: "numeric_min",
    target: null,
    target_date: null,
    weightage: null,
  };
}

function rowFromGoal(g: Goal, parentOwnerByGoalId?: Record<string, string>): GoalRow {
  return {
    _key: g.id,
    id: g.id,
    thrust_area_id: g.thrust_area_id,
    title: g.title,
    description: g.description,
    uom_type: g.uom_type,
    target: g.target,
    target_date: g.target_date,
    weightage: g.weightage,
    parent_goal_id: g.parent_goal_id,
    parent_owner_name: g.parent_goal_id
      ? (parentOwnerByGoalId?.[g.id] ?? null)
      : null,
  };
}

export function GoalSheetForm({
  sheetId,
  initialGoals,
  thrustAreas,
  isReturned,
  returnReason,
  canShare,
  shareCandidates,
  recipientsByGoalId,
  parentOwnerByGoalId,
  saveDraftAction,
  hideSubmit = false,
  assignHint,
}: Props) {
  const router = useRouter();
  const [goals, setGoals] = useState<GoalRow[]>(() =>
    initialGoals.length > 0
      ? initialGoals.map((g) => rowFromGoal(g, parentOwnerByGoalId))
      : [newRow()]
  );
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [submitOpen, setSubmitOpen] = useState(false);
  const [isSaving, startSaving] = useTransition();
  const [isSubmitting, startSubmitting] = useTransition();

  const validation = useGoalSheetValidation(goals);

  function patch(idx: number, p: Partial<GoalRow>) {
    setGoals((prev) => prev.map((g, i) => (i === idx ? { ...g, ...p } : g)));
  }

  function deleteAt(idx: number) {
    setGoals((prev) => prev.filter((_, i) => i !== idx));
  }

  function addGoal() {
    if (goals.length >= MAX_GOALS) {
      toast.error(`Max ${MAX_GOALS} goals`);
      return;
    }
    setGoals((prev) => [...prev, newRow()]);
  }

  function payload(): GoalDraftInput[] {
    return goals.map((g) => ({
      id: g.id ?? null,
      thrust_area_id: g.thrust_area_id,
      title: g.title,
      description: g.description,
      uom_type: g.uom_type,
      target: g.target,
      target_date: g.target_date,
      weightage: g.weightage,
      parent_goal_id: g.parent_goal_id ?? null,
    }));
  }

  function handleSaveDraft() {
    startSaving(async () => {
      const save = saveDraftAction ?? saveDraft;
      const result = await save(sheetId, payload());
      if (!result.ok) {
        toast.error(result.error ?? "Failed to save");
        return;
      }
      toast.success("Draft saved");
      router.refresh();
    });
  }

  function handleSubmit() {
    startSubmitting(async () => {
      const result = await submitForApproval(sheetId, payload());
      if (!result.ok) {
        toast.error(result.error ?? "Failed to submit");
        setSubmitOpen(false);
        return;
      }
      toast.success("Submitted for approval");
      setSubmitOpen(false);
      router.push(`/goals/${sheetId}`);
      router.refresh();
    });
  }

  const submitDisabledReason = !validation.isValid
    ? validation.errors.find((e) => e.field === "form")?.message ??
      "Fix highlighted issues to enable submit"
    : null;

  return (
    <>
      {isReturned && returnReason && (
        <div className="mb-6 rounded-md border border-destructive/40 bg-destructive/5 p-4">
          <div className="text-sm font-medium text-destructive">
            Returned for rework
          </div>
          <p className="mt-1 text-sm text-foreground">{returnReason}</p>
        </div>
      )}

      {assignHint && hideSubmit ? (
        <p className="mb-4 rounded-md border border-muted-foreground/20 bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
          {assignHint}
        </p>
      ) : null}

      <WeightageBar
        total={validation.totalWeightage}
        goalCount={validation.goalCount}
        maxGoals={MAX_GOALS}
      />

      <div className="space-y-4">
        {goals.map((g, idx) => (
          <GoalCard
            key={g._key}
            index={idx}
            goal={g}
            thrustAreas={thrustAreas}
            errors={validation.errors}
            isCollapsed={!!collapsed[g._key]}
            toggleCollapsed={() =>
              setCollapsed((prev) => ({ ...prev, [g._key]: !prev[g._key] }))
            }
            onChange={(patchValues) => patch(idx, patchValues)}
            onDelete={() => deleteAt(idx)}
            canShare={canShare && !g.parent_goal_id}
            shareCandidates={shareCandidates}
            existingRecipientIds={
              g.id ? (recipientsByGoalId?.[g.id] ?? []) : []
            }
            isChild={!!g.parent_goal_id}
            parentOwnerName={g.parent_owner_name ?? null}
          />
        ))}
      </div>

      <div className="mt-4 flex justify-center">
        <Button
          type="button"
          variant="outline"
          onClick={addGoal}
          disabled={goals.length >= MAX_GOALS}
        >
          <Plus className="mr-1 h-4 w-4" /> Add goal
          {goals.length >= MAX_GOALS && (
            <span className="ml-2 text-xs text-muted-foreground">(max reached)</span>
          )}
        </Button>
      </div>

      {/* Sticky bottom bar */}
      <div className="sticky bottom-0 -mx-6 mt-8 border-t bg-background/95 px-6 py-3 backdrop-blur">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-xs text-muted-foreground">
            {hideSubmit
              ? validation.errors.length === 0
                ? "Save when done. Your team member submits from My goals."
                : `${validation.errors.length} issue${validation.errors.length === 1 ? "" : "s"} to resolve`
              : validation.errors.length === 0
                ? "Looks good. Submit when you're ready."
                : `${validation.errors.length} issue${validation.errors.length === 1 ? "" : "s"} to resolve`}
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleSaveDraft}
              disabled={isSaving}
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Save draft
            </Button>
            {hideSubmit ? null : submitDisabledReason ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span tabIndex={0}>
                    <Button type="button" disabled>
                      <Send className="h-4 w-4" />
                      Submit for approval
                    </Button>
                  </span>
                </TooltipTrigger>
                <TooltipContent>{submitDisabledReason}</TooltipContent>
              </Tooltip>
            ) : (
              <Button type="button" onClick={() => setSubmitOpen(true)}>
                <Send className="h-4 w-4" />
                Submit for approval
              </Button>
            )}
          </div>
        </div>
      </div>

      <Dialog open={submitOpen} onOpenChange={setSubmitOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit goal sheet?</DialogTitle>
            <DialogDescription>
              Once submitted, you cannot edit until your manager approves or
              returns it for rework.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSubmitOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Confirm submit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
