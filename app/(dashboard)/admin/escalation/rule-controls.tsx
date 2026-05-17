"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Pencil } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createRule, updateRule, deleteRule, toggleRule } from "./actions";
import type { EscalationRule, EscalationTriggerEvent } from "@/types/database";

const TRIGGER_OPTIONS: Array<{ value: EscalationTriggerEvent; label: string }> = [
  { value: "goals_not_submitted", label: "Goals not submitted in time" },
  { value: "goals_not_approved", label: "Submitted goals awaiting approval" },
  { value: "checkin_not_done", label: "Quarterly check-in not completed" },
];

interface RuleFormProps {
  rule?: EscalationRule;
  trigger?: React.ReactNode;
}

export function RuleForm({ rule, trigger }: RuleFormProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(rule?.name ?? "");
  const [triggerEvent, setTriggerEvent] = useState<EscalationTriggerEvent>(
    rule?.trigger_event ?? "goals_not_submitted"
  );
  const [thresholdDays, setThresholdDays] = useState(rule?.threshold_days ?? 7);
  const [notifyEmployee, setNotifyEmployee] = useState(rule?.notify_employee ?? true);
  const [notifyManager, setNotifyManager] = useState(rule?.notify_manager ?? true);
  const [notifyHr, setNotifyHr] = useState(rule?.notify_hr ?? false);
  const [isPending, startTransition] = useTransition();

  const isEdit = !!rule;

  function submit() {
    startTransition(async () => {
      const payload = {
        name,
        trigger_event: triggerEvent,
        threshold_days: thresholdDays,
        notify_employee: notifyEmployee,
        notify_manager: notifyManager,
        notify_hr: notifyHr,
      };
      const r = isEdit ? await updateRule(rule!.id, payload) : await createRule(payload);
      if (!r.ok) {
        toast.error(r.error ?? "Failed");
        return;
      }
      toast.success(isEdit ? "Rule updated" : "Rule created");
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button>
            <Plus className="h-4 w-4" /> New rule
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit rule" : "New escalation rule"}</DialogTitle>
          <DialogDescription>
            Rules fire automatically when SLAs are breached. Run manually any time
            from the page header.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="rule-name">Name</Label>
            <Input
              id="rule-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Goals overdue 7 days"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Trigger</Label>
            <Select
              value={triggerEvent}
              onValueChange={(v) => setTriggerEvent(v as EscalationTriggerEvent)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TRIGGER_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="threshold">Fire after (days)</Label>
            <Input
              id="threshold"
              type="number"
              min={1}
              max={365}
              value={thresholdDays}
              onChange={(e) => setThresholdDays(Math.max(1, Number(e.target.value) || 1))}
            />
            <p className="text-xs text-muted-foreground">
              Counted from the relevant phase open / submission date.
            </p>
          </div>

          <div className="rounded-md border p-3 space-y-2">
            <div className="text-xs font-medium text-muted-foreground">Notify</div>
            <ToggleRow
              label="Employee"
              checked={notifyEmployee}
              onChange={setNotifyEmployee}
            />
            <ToggleRow
              label="Manager"
              checked={notifyManager}
              onChange={setNotifyManager}
            />
            <ToggleRow label="HR / Admin" checked={notifyHr} onChange={setNotifyHr} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={submit}
            disabled={isPending || name.trim().length < 2 || thresholdDays < 1}
          >
            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {isEdit ? "Save" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span>{label}</span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

export function RuleEditButton({ rule }: { rule: EscalationRule }) {
  return (
    <RuleForm
      rule={rule}
      trigger={
        <Button variant="ghost" size="sm">
          <Pencil className="h-3.5 w-3.5" />
          Edit
        </Button>
      }
    />
  );
}

export function RuleToggle({ rule }: { rule: EscalationRule }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  return (
    <Switch
      checked={rule.is_active}
      disabled={isPending}
      onCheckedChange={(v) => {
        startTransition(async () => {
          const r = await toggleRule(rule.id, v);
          if (!r.ok) toast.error(r.error ?? "Failed");
          else router.refresh();
        });
      }}
    />
  );
}

export function RuleDeleteButton({ rule }: { rule: EscalationRule }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={isPending}
      onClick={() => {
        if (!confirm(`Delete "${rule.name}"? Logged escalations will keep their history.`)) {
          return;
        }
        startTransition(async () => {
          const r = await deleteRule(rule.id);
          if (!r.ok) toast.error(r.error ?? "Failed");
          else {
            toast.success("Rule deleted");
            router.refresh();
          }
        });
      }}
    >
      Delete
    </Button>
  );
}
