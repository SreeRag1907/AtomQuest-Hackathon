"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarRange, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { createCycle } from "./actions";

export function CycleCreateButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState({
    name: "",
    goal_setting_opens: "",
    goal_setting_closes: "",
    q1_opens: "",
    q1_closes: "",
    q2_opens: "",
    q2_closes: "",
    q3_opens: "",
    q3_closes: "",
    q4_opens: "",
    q4_closes: "",
  });

  function update(k: keyof typeof form, v: string) {
    setForm((p) => ({ ...p, [k]: v }));
  }

  /**
   * Fills the form with the canonical BRD calendar:
   *   Goal setting:   May 1 → June 30  (year Y)
   *   Q1 check-in:    July 1 → July 31
   *   Q2 check-in:    Oct 1 → Oct 31
   *   Q3 check-in:    Jan 1 → Jan 31   (year Y+1)
   *   Q4 / annual:    Mar 1 → Apr 30   (year Y+1)
   */
  function applyBrdCalendar(startYear: number) {
    const Y = startYear;
    const N = startYear + 1;
    const iso = (y: number, m: number, d: number) =>
      `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    setForm({
      name: form.name || `FY${String(Y).slice(2)}-${String(N).slice(2)}`,
      goal_setting_opens: iso(Y, 5, 1),
      goal_setting_closes: iso(Y, 6, 30),
      q1_opens: iso(Y, 7, 1),
      q1_closes: iso(Y, 7, 31),
      q2_opens: iso(Y, 10, 1),
      q2_closes: iso(Y, 10, 31),
      q3_opens: iso(N, 1, 1),
      q3_closes: iso(N, 1, 31),
      q4_opens: iso(N, 3, 1),
      q4_closes: iso(N, 4, 30),
    });
  }


  function submit() {
    startTransition(async () => {
      const r = await createCycle({
        name: form.name,
        goal_setting_opens: form.goal_setting_opens || null,
        goal_setting_closes: form.goal_setting_closes || null,
        q1_opens: form.q1_opens || null,
        q1_closes: form.q1_closes || null,
        q2_opens: form.q2_opens || null,
        q2_closes: form.q2_closes || null,
        q3_opens: form.q3_opens || null,
        q3_closes: form.q3_closes || null,
        q4_opens: form.q4_opens || null,
        q4_closes: form.q4_closes || null,
      });
      if (!r.ok) {
        toast.error(r.error ?? "Failed");
        return;
      }
      toast.success("Cycle created");
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4" /> Create cycle
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Create a new cycle</DialogTitle>
          <DialogDescription>
            You can leave dates empty for a quick demo cycle and advance phases
            manually, or fill them with the standard fiscal calendar below.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Name</Label>
            <Input
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
              placeholder="FY2027"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2 rounded-md border bg-muted/30 p-2 text-xs">
            <CalendarRange className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-muted-foreground">
              Use BRD calendar (May / Jul / Oct / Jan / Mar–Apr):
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => applyBrdCalendar(new Date().getFullYear())}
            >
              FY {String(new Date().getFullYear()).slice(2)}-
              {String(new Date().getFullYear() + 1).slice(2)}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => applyBrdCalendar(new Date().getFullYear() + 1)}
            >
              FY {String(new Date().getFullYear() + 1).slice(2)}-
              {String(new Date().getFullYear() + 2).slice(2)}
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Pair label="Goal setting opens" value={form.goal_setting_opens} onChange={(v) => update("goal_setting_opens", v)} />
            <Pair label="Goal setting closes" value={form.goal_setting_closes} onChange={(v) => update("goal_setting_closes", v)} />
            <Pair label="Q1 opens" value={form.q1_opens} onChange={(v) => update("q1_opens", v)} />
            <Pair label="Q1 closes" value={form.q1_closes} onChange={(v) => update("q1_closes", v)} />
            <Pair label="Q2 opens" value={form.q2_opens} onChange={(v) => update("q2_opens", v)} />
            <Pair label="Q2 closes" value={form.q2_closes} onChange={(v) => update("q2_closes", v)} />
            <Pair label="Q3 opens" value={form.q3_opens} onChange={(v) => update("q3_opens", v)} />
            <Pair label="Q3 closes" value={form.q3_closes} onChange={(v) => update("q3_closes", v)} />
            <Pair label="Q4 opens" value={form.q4_opens} onChange={(v) => update("q4_opens", v)} />
            <Pair label="Q4 closes" value={form.q4_closes} onChange={(v) => update("q4_closes", v)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={submit} disabled={isPending || form.name.length < 2}>
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Pair({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <Input type="date" value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
