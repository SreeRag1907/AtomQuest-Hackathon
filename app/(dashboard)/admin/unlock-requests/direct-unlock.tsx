"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Unlock } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { adminUnlockSheet } from "./actions";

interface Props {
  sheetId: string;
  employeeName: string;
}

const CONFIRM_PHRASE = "UNLOCK";

export function DirectUnlock({ sheetId, employeeName }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [confirm, setConfirm] = useState("");
  const [isPending, startTransition] = useTransition();

  function submit() {
    startTransition(async () => {
      const r = await adminUnlockSheet(sheetId, reason);
      if (!r.ok) {
        toast.error(r.error ?? "Failed");
        return;
      }
      toast.success("Sheet unlocked");
      setOpen(false);
      setReason("");
      setConfirm("");
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Unlock className="h-3.5 w-3.5" /> Unlock
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Unlock {employeeName}'s goals?</DialogTitle>
          <DialogDescription>
            This temporarily moves the sheet to <strong>approved</strong> so the employee can edit.
            The action is permanent in the audit log. Manager re-approval is required afterward.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Reason (logged in audit trail)</Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder="Why is this unlock necessary?"
            />
          </div>
          <div className="space-y-1.5">
            <Label>
              Type <code className="rounded bg-muted px-1 py-0.5 text-xs">{CONFIRM_PHRASE}</code> to confirm
            </Label>
            <Input
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder={CONFIRM_PHRASE}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button
            variant="destructive"
            disabled={
              isPending || reason.trim().length < 5 || confirm.trim() !== CONFIRM_PHRASE
            }
            onClick={submit}
          >
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Unlock sheet
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
