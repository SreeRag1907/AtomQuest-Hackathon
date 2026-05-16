"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { approveGoalSheet, returnGoalSheet } from "@/app/(dashboard)/team/actions";

interface Props {
  sheetId: string;
  employeeName: string;
}

export function ApprovalActions({ sheetId, employeeName }: Props) {
  const router = useRouter();
  const [returnOpen, setReturnOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [isApproving, startApproving] = useTransition();
  const [isReturning, startReturning] = useTransition();

  function handleApprove() {
    startApproving(async () => {
      const r = await approveGoalSheet(sheetId);
      if (!r.ok) {
        toast.error(r.error ?? "Failed");
        return;
      }
      toast.success("Sheet approved and locked");
      router.refresh();
    });
  }

  function handleReturn() {
    startReturning(async () => {
      const r = await returnGoalSheet(sheetId, reason);
      if (!r.ok) {
        toast.error(r.error ?? "Failed");
        return;
      }
      toast.success("Returned for rework");
      setReturnOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      <Card className="flex items-center justify-between gap-3 border-warning/40 bg-warning/5 p-4">
        <div>
          <div className="text-sm font-medium">Awaiting your review</div>
          <p className="text-xs text-muted-foreground">
            Approve to lock the sheet, or return it with a reason for rework.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setReturnOpen(true)}
            disabled={isApproving || isReturning}
          >
            <Undo2 className="h-4 w-4" /> Return for rework
          </Button>
          <Button onClick={handleApprove} disabled={isApproving || isReturning}>
            {isApproving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            Approve & lock
          </Button>
        </div>
      </Card>

      <Dialog open={returnOpen} onOpenChange={setReturnOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Return {employeeName}'s goals for rework</DialogTitle>
            <DialogDescription>
              The employee will get a notification with this reason and can re-submit.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="reason">Reason</Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Be specific so the employee knows what to change..."
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReturnOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleReturn}
              disabled={isReturning || reason.trim().length < 5}
              variant="destructive"
            >
              {isReturning ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Return for rework
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
