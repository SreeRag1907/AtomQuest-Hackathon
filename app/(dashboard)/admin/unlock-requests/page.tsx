import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/empty-state";
import { Unlock } from "lucide-react";
import { GoalStatusBadge } from "@/components/status-badge";
import { DirectUnlock } from "./direct-unlock";
import { RequestActions } from "./request-actions";
import type { GoalSheet, Profile, UnlockRequest } from "@/types/database";

export default async function UnlockRequestsPage() {
  const supabase = await createClient();

  const { data: requests } = await supabase
    .from("unlock_requests")
    .select("*")
    .order("created_at", { ascending: false });

  const { data: lockedSheets } = await supabase
    .from("goal_sheets")
    .select("*")
    .eq("status", "locked");

  const employeeIds = [
    ...new Set([
      ...((requests ?? []).map((r) => r.requested_by)),
      ...((lockedSheets ?? []).map((s) => s.employee_id)),
    ]),
  ];

  const { data: profiles } =
    employeeIds.length > 0
      ? await supabase.from("profiles").select("*").in("id", employeeIds)
      : { data: [] as Profile[] };
  const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Unlock requests"
        description="Approve or reject employee/manager requests, or unlock directly with a logged reason."
      />

      <Card>
        <CardContent className="space-y-3 p-5">
          <div className="text-sm font-semibold">Pending requests</div>
          {(requests ?? []).filter((r) => r.status === "pending").length === 0 ? (
            <EmptyState
              icon={Unlock}
              title="No pending requests"
              description="When users request unlocks, they'll appear here."
            />
          ) : (
            <ul className="space-y-2">
              {(requests ?? [])
                .filter((r) => r.status === "pending")
                .map((r: UnlockRequest) => {
                  const requester = profileById.get(r.requested_by);
                  return (
                    <li
                      key={r.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-3 text-sm"
                    >
                      <div>
                        <div className="font-medium">{requester?.full_name ?? "Unknown"}</div>
                        <div className="mt-0.5 text-xs text-muted-foreground">{r.reason}</div>
                      </div>
                      <RequestActions requestId={r.id} />
                    </li>
                  );
                })}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3 p-5">
          <div className="text-sm font-semibold">Locked sheets — direct unlock</div>
          <p className="text-xs text-muted-foreground">
            Direct unlocks require a reason and are written to the audit log.
          </p>
          {(lockedSheets ?? []).length === 0 ? (
            <EmptyState icon={Unlock} title="No locked sheets" />
          ) : (
            <ul className="space-y-2">
              {(lockedSheets ?? []).map((s: GoalSheet) => {
                const emp = profileById.get(s.employee_id);
                return (
                  <li
                    key={s.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-3 text-sm"
                  >
                    <div className="flex items-center gap-3">
                      <GoalStatusBadge status={s.status} />
                      <div>
                        <div className="font-medium">{emp?.full_name ?? "Unknown"}</div>
                        <div className="text-xs text-muted-foreground">
                          Locked {s.locked_at ? new Date(s.locked_at).toLocaleDateString() : "—"}
                        </div>
                      </div>
                    </div>
                    <DirectUnlock sheetId={s.id} employeeName={emp?.full_name ?? "this user"} />
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
