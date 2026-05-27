# AtomQuest — Production-Grade Audit

A consolidated read-only audit of the AtomQuest portal (Next.js 15 + Supabase) covering auth, employee, manager, admin, data layer, and shared UI. Each finding has:

- **Severity**: `P0` (security or breaking bug), `P1` (UX / state correctness), `P2` (a11y, dead code, perf, polish)
- **Where**: cited file & line
- **Fix**: brief, actionable

> Audit pre-requisites: `npm run typecheck` and `npm run lint` are both **clean**.
> No automated tests existed prior to this audit (`e2e/` and `test-results/` were empty).

---

## Table of contents

1. [Auth flow](#1-auth-flow)
2. [Employee flow](#2-employee-flow)
3. [Manager flow](#3-manager-flow)
4. [Admin flow](#4-admin-flow)
5. [Data layer (schema, RLS, scoring, seed)](#5-data-layer)
6. [Shared UI & cross-cutting](#6-shared-ui--cross-cutting)
7. [Severity index](#7-severity-index)
8. [Scoping decisions](#8-scoping-decisions)

---

## 1. Auth flow

### Strengths

- Open-redirect guard on password login (`from` must start with `/` and not `//`) — `app/(auth)/login/login-form.tsx` ~L90.
- Stale refresh handling clears `sb-*` cookies on `refresh_token_not_found` — `lib/supabase/middleware.ts` ~L51.
- Session-expired banner when middleware sends user to login with internal `from` — `login-form.tsx` ~L113.
- Friendly Supabase error mapping — `login-form.tsx` ~L77.
- Demo logins env-gated — `lib/show-demo-login.ts`; `login-form.tsx` ~L16.
- Entra sync with manager lookup — `lib/auth/entra-sync.ts`; `app/auth/callback/route.ts`.

### Findings

| # | Sev | File:Line | Issue | Fix |
|--:|----|-----------|-------|-----|
| A1 | **P0** | `app/(auth)/signup/signup-form.tsx` L129–139 + `supabase/migrations/0003_audit_triggers.sql` L83–86 | Open signup includes Employee/Manager/**Admin** role picker; `handle_new_user` trusts `raw_user_meta_data.role` — privilege escalation. | Remove role select; new migration `0010_secure_signup.sql` ignores client-supplied role unless inserted via service role. |
| A2 | **P0** | `lib/auth.ts` L23–26 ↔ `lib/supabase/middleware.ts` L84–88 | Authenticated user with **no profile row** loops: `requireProfile→/login`, middleware sees session → `/dashboard`. | `requireProfile` redirects to `/auth/error?code=no_profile`; middleware whitelists `/auth/error`. |
| A3 | **P0** | `lib/supabase/middleware.ts` | Deactivated user (`profiles.is_active=false`) keeps access until JWT expires. | After `getUser`, fetch `profiles.is_active`; if false, `signOut` and redirect `/login?reason=deactivated`. |
| A4 | **P0** | `app/(auth)/login/login-form.tsx` L56 | "Forgot password" sends to `/auth/callback?next=/update-password` — **no such route exists**. | Add `app/(auth)/update-password/page.tsx`. |
| A5 | **P1** | `app/auth/callback/route.ts` L22–24, L34–36 + `login-form.tsx` | Callback sets `?oauth_error=…` but login form ignores it. | Read and render via the existing banner block. |
| A6 | **P1** | `login-form.tsx` L106 | OAuth `redirectTo` is fixed → `from` deep-link is lost on SSO. | Append `?next=` from URL onto `redirectTo`. |
| A7 | **P1** | `app/auth/callback/route.ts` L81 | `next` is concatenated to origin without internal-path validation. | Apply same guard as login: must start with `/` and not `//`. |
| A8 | **P1** | `app/auth/callback/route.ts` | Profile-sync errors are silent — user proceeds with stale/missing profile. | Surface `?oauth_error=profile_sync_failed`. |
| A9 | **P1** | `app/(auth)/signup/signup-form.tsx` L71 | After non-dev `signUp`, `router.replace("/dashboard")` runs even when email confirmation pending. | Detect `data.session === null` and show "check your email" state. |
| A10 | **P1** | `signup-form.tsx` L129 | `<Label>Role` not associated with `Select`. | Wire `htmlFor`/`id`. |
| A11 | **P2** | `login-form.tsx` L176 | Show/hide password toggle has `tabIndex={-1}` and no `aria-label`. | Add `aria-label="Show password"`; keep keyboard reachable. |
| A12 | **P2** | `login-form.tsx` | No `aria-live` region for inline form errors. | Add polite live region above submit. |
| A13 | **P2** | `lib/auth.ts` L31 | `requireRole` silently redirects to `/dashboard` (no message). | Redirect with `?reason=insufficient_role` and surface a toast on dashboard. |
| A14 | **P2** | `lib/supabase/middleware.ts` | Lists `/auth/error` as public but no such route exists. | Either create the route (see A2) or remove from list. |

### Edge cases

| Case | Current | Verdict |
|------|---------|---------|
| Expired session | Banner + cookie cleanup | Good |
| No profile row | Redirect loop | **Bug (A2)** |
| Deactivated user | Reaches dashboard | **Gap (A3)** |
| Wrong role | Silent redirect | Acceptable; toast missing (A13) |
| OAuth failure | `?oauth_error=…` set, not displayed | **Gap (A5)** |
| Entra missing groups | Falls back to employee/existing | By design |

---

## 2. Employee flow

### Strengths

- Phase-aware UX (`isGoalSettingWindowOpen`, `isCheckinPhase`, `CycleBanner`).
- Return-with-reason surfaced on dashboard, list, form banner, detail page.
- Draft/submit split: forgiving `saveDraft`, strict `submitForApproval` + Zod.
- Layered validation: hook + zod + server `replaceGoals` + DB `weightage` CHECK.
- Live weightage bar, per-field errors, disabled submit with tooltip reason.
- Double-submit prevention via `useTransition`.
- Shared child goals: read-only fields with achievement sync triggers.

### Findings

| # | Sev | File:Line | Issue | Fix |
|--:|----|-----------|-------|-----|
| E1 | **P0** | `app/(dashboard)/goals/actions.ts` L146–150 | Returned sheets cannot resubmit after `goal_setting` phase ends — manager-invited rework gets stuck. | Allow `submitForApproval` when `status='returned'` regardless of phase. |
| E2 | **P0** | `app/(dashboard)/goals/[id]/page.tsx` L175–177 | "Edit & resubmit" link points to `/goals/new` which is blocked when window closed. | Keep on `/goals/[id]`, render inline form for returned status. |
| E3 | **P0** | `app/(dashboard)/goals/actions.ts` L276, L294 vs `supabase/migrations/0001_enums_tables.sql` L127 | `replaceGoals` uses `weightage ?? 0` but DB CHECK requires 10–100 → partial drafts crash. | Relax CHECK to `weightage is null or (weightage between 10 and 100)`; enforce 10–100 in submit path only. |
| E4 | **P1** | `lib/scoring/compute-score.ts` L58–59 vs `app/(dashboard)/check-ins/history/page.tsx` L102–114 | `computeSheetScore` returns `null` when no data; history badge shows `—` but `<Progress value={score ?? 0}>` shows 0% bar — misleading. | Render no bar when `score===null`, only the dash. |
| E5 | **P1** | `app/(dashboard)/goals/actions.ts` L128–131 vs `lib/validations/goal.ts` L79 vs `hooks/use-goal-sheet-validation.ts` L54–56 | 8-goal limit counts non-child server-side but counts all goals on client/zod — shared child goals block submit incorrectly. | Align all three to count `parent_goal_id is null` only. |
| E6 | **P1** | `app/(dashboard)/check-ins/checkin-form.tsx` L83 + `actions.ts` L63 | Can save `not_started` with null actuals; no per-quarter friendly hint. | Optional: warn before save when all goals `not_started`. |
| E7 | **P2** | `components/goals/weightage-bar.tsx` L39 | Total weightage hidden on mobile (`hidden sm:block`). | Show compact total on mobile. |
| E8 | **P2** | `app/(dashboard)/settings/profile-form.tsx` | Labels lack `htmlFor`; no client validation; generic toast "Failed". | Wire labels; validate name length; specific toast. |
| E9 | **P2** | `app/(dashboard)/settings/theme-preference.tsx` L21–34 | Theme buttons no `aria-pressed`. | Add active state. |
| E10 | **P2** | `components/command-palette.tsx` L63 | `/check-ins/history` only in command palette, not sidebar. | Add to nav under Check-ins or as expandable section. |
| E11 | **P2** | `components/goals/goal-sheet-form.tsx` L268 | Save button shows only spinner, no `pendingLabel`. | Show "Saving…". |

### Validation layer matrix (goals)

| Rule | Client hook | Zod submit | Server draft | DB |
|------|-------------|-----------|--------------|-----|
| Max 8 goals | All goals | All goals | Non-child only | None |
| Weight 10–100 | Yes | Yes | Not on draft | Column CHECK (will relax for null — E3) |
| Total = 100% | Yes | Yes | No | None |
| Required fields | Yes | Yes | No | Only title NOT NULL |

---

## 3. Manager flow

### Strengths

- Strong authorization (`notFound()` if not admin and not direct manager).
- Phase-aware CTAs (assign, reminder).
- Audit drawer on sheet detail with entity-scoped history.
- Separate `useTransition` per approve/return action.
- Return dialog: 5–1000 char validation, blocks close while submitting.
- Approve → notification + email + Teams card.
- Inline edits: weightage sum + child-goal lock + notification + audit.

### Findings

| # | Sev | File:Line | Issue | Fix |
|--:|----|-----------|-------|-----|
| M1 | **P0** | `app/(dashboard)/team/approvals/page.tsx` L27–28 | For admins, team query has no filter → admins/managers with sheets appear in queue. Inconsistent with `/team`. | Restrict to `role='employee'`; also filter active cycle. |
| M2 | **P0** | `app/(dashboard)/team/[employeeId]/assign-goals/page.tsx` L55 + `app/(dashboard)/team/actions.ts` L70–72 | Manager assign uses `isGoalSettingPhase` only; employee path uses `isGoalSettingWindowOpen` (date-aware). | Use `isGoalSettingWindowOpen` in both manager paths. |
| M3 | **P0** | `app/(dashboard)/team/[employeeId]/assign-goals/page.tsx` L73 | Navigating to URL **creates** a draft sheet (side effect on GET). | Move sheet creation behind first save. |
| M4 | **P1** | `app/(dashboard)/team/actions.ts` L144–207 | Approve sets `status='locked'` directly, skipping `'approved'`; funnel/report "Approved" stage stays empty. | Approve → `'approved'` only; admin unlock toggles back; downstream report rebuilds funnel. |
| M5 | **P1** | `app/(dashboard)/team/[employeeId]/approval-actions.tsx` L75–78 | Approve is one click — irreversible lock with no confirmation. | AlertDialog with weightage-sum sanity check. |
| M6 | **P1** | `app/(dashboard)/team/page.tsx` | Inactive employees still appear; no error UI on Supabase errors. | Filter `is_active`; show empty/error states. |
| M7 | **P1** | `app/(dashboard)/team/[employeeId]/page.tsx` L97 | "Reports to": shows "You" only when `manager_id===me.id`; otherwise "—" even if employee has a manager. | Resolve manager full name. |
| M8 | **P1** | `app/(dashboard)/team/[employeeId]/page.tsx` L86 | Loads **all** thrust areas including inactive on inline edit. | Filter `is_active`. |
| M9 | **P1** | `app/(dashboard)/team/[employeeId]/checkin-reminder-button.tsx` | No cooldown — manager can spam reminders. | Server: 12h cooldown per (manager, employee, quarter). |
| M10 | **P1** | `app/(dashboard)/team/[employeeId]/checkin-review.tsx` | `currentManagerId` prop unused; comments lack author attribution. | Drop prop; show author name on comments. |
| M11 | **P2** | `app/(dashboard)/team/[employeeId]/checkin-review.tsx` | Achievement table missing `overflow-x-auto` wrapper. | Wrap table. |
| M12 | **P2** | `app/(dashboard)/team/[employeeId]/page.tsx` | No `CycleBanner` on detail page. | Add it. |

---

## 4. Admin flow

### Strengths

- Admin-only layout guard.
- Cycle controls with BRD calendar preset.
- Service-role invite with dev-bypass (45s toast + password).
- Strong governance UX on direct unlock (reason + `UNLOCK` confirm phrase).
- Escalation engine: dedupe + multi-channel notify + manual run check.
- `profilesVisibleToViewer` for manager-scoped reports.

### Findings

| # | Sev | File:Line | Issue | Fix |
|--:|----|-----------|-------|-----|
| AD1 | **P0** | `app/(dashboard)/reports/achievement/page.tsx` L31–48 vs `achievement-report.tsx` L192–204 | Cycle dropdown lists all cycles, server only fetches **active cycle data** — historical reports are empty/wrong. | Accept `cycleId` searchParam; fetch sheets/goals/achievements for the selected cycle. |
| AD2 | **P0** | `app/(dashboard)/reports/completion/completion-charts.tsx` L74–99 | "Employees who haven't submitted" iterates **all** profiles → lists everyone. | Filter to profiles whose sheet is missing or `status='draft'`. |
| AD3 | **P0** | `app/(dashboard)/admin/unlock-requests/actions.ts` L90–96 | Request marked `approved` before `adminUnlockSheet` succeeds — partial failure leaves request "approved", sheet still locked. | Unlock first; only on success mark request. |
| AD4 | **P0** | `app/(dashboard)/admin/users/actions.ts` `updateUser` | No self-demotion / self-deactivate guard — admin can lock self out mid-session. | Block when target is caller and role moves away from admin or `is_active=false`. |
| AD5 | **P1** | `app/(dashboard)/admin/cycles/cycle-controls.tsx` L47–57 + `app/(dashboard)/admin/cycles/actions.ts` L97–101, L112 | Phase jump and activate are one-click with no confirmation. | AlertDialog for both. |
| AD6 | **P1** | `app/(dashboard)/admin/cycles/actions.ts` L130 | `phase.replace("_", " ")` only replaces first underscore → `q4_annual` → "q4 annual". | Use full mapping (`CYCLE_PHASE_LABELS` in `lib/cycle.ts`). |
| AD7 | **P1** | `app/(dashboard)/admin/users/users-table.tsx` L35, L79 | One `useTransition` for whole table — editing one user disables all controls. | Per-row pending state. |
| AD8 | **P1** | `app/(dashboard)/admin/users/actions.ts` | Duplicate-email surfaces raw Supabase error. | Friendly "Email already in use". |
| AD9 | **P1** | `app/(dashboard)/admin/users/invite-button.tsx` L33 | `managers` prop passed but unused (`_managers`). | Wire manager assignment into invite. |
| AD10 | **P1** | `app/(dashboard)/admin/users/users-table.tsx` | No pagination — perf risk. | Page size 25 with paginator. |
| AD11 | **P1** | `app/(dashboard)/admin/escalation/escalation-log-table.tsx` L143–144 | Resolve uses native `prompt()` — poor UX/a11y. | Dialog with textarea. |
| AD12 | **P1** | `app/(dashboard)/admin/thrust-areas/page.tsx` | Empty table state missing; deactivate has no usage warning; no edit-name UI. | Empty state; confirm with usage count; inline rename. |
| AD13 | **P1** | `app/(dashboard)/admin/unlock-requests/page.tsx` | Approved/rejected requests vanish — no history. | History card. |
| AD14 | **P1** | `app/(dashboard)/admin/audit-log/page.tsx` | 500-row cap; older entries invisible. | Server-side pagination ("Load more"). |
| AD15 | **P1** | `app/(dashboard)/admin/escalation/actions.ts` L482–490 | Teams card sent on every fire regardless of notify toggles. | Honor `notify_teams`. |
| AD16 | **P2** | `app/(dashboard)/admin/cycles/page.tsx` L18 | `DemoPhaseHint` commented out; orphan import. | Remove or wire up. |
| AD17 | **P2** | `app/(dashboard)/analytics/page.tsx` L333 | `<span className="hidden">{profileById.size}</span>` dead. | Delete. |
| AD18 | **P2** | `app/(dashboard)/analytics/page.tsx` L34 | `.single()` on missing active cycle throws. | Use `.maybeSingle()`. |
| AD19 | **P2** | `app/(dashboard)/admin/audit-log/audit-table.tsx` | Expand buttons missing `aria-expanded`. | Add. |

---

## 5. Data layer

### Schema inventory

12 tables, 5 enums, 3 views, 16 functions. All tables `ENABLE ROW LEVEL SECURITY`. See migrations `0001`–`0009`.

### Findings

| # | Sev | File:Line | Issue | Fix |
|--:|----|-----------|-------|-----|
| D1 | **P0** | `supabase/migrations/0005_shared_goals.sql` L174–189 | View `shared_goal_recipients` lacks `WITH (security_invoker=true)` → runs as owner, **bypasses RLS** → any authenticated user can read all parent/child mappings org-wide. | Recreate with `security_invoker=true` in `0010`. |
| D2 | **P0** | `supabase/migrations/0002_rls_policies.sql` L260–261 | `audit_log` allows **any authenticated user** to insert arbitrary rows (`changed_by`, before/after spoofable). | Drop policy; insert only via SECURITY DEFINER trigger function. |
| D3 | **P0** | `supabase/migrations/0002_rls_policies.sql` L278–279 | `notifications`: any authenticated can insert for **any** `user_id`. | Restrict `WITH CHECK (user_id = auth.uid())`; expose `notify_user()` SECURITY DEFINER for server-side fan-out. |
| D4 | **P0** | `supabase/migrations/0002_rls_policies.sql` L112–117 | Employee `goal_sheets` update `WITH CHECK` only verifies `employee_id`; status not constrained → employee could set `status='approved'` via direct API. | Add CHECK forbidding employee from setting `status` to `approved` or `locked`. |
| D5 | **P0** | `supabase/migrations/0002_rls_policies.sql` L69–71 | `profiles: self update` only freezes `role`; employee can change `manager_id`, `is_active`, `email`, etc. | Restrict `WITH CHECK` to immutable: `role`, `manager_id`, `is_active`, `email` unchanged. |
| D6 | **P0** | `supabase/migrations/0003_audit_triggers.sql` L83–86 | `handle_new_user` honors `raw_user_meta_data.role` set by client (signup). | Only honor metadata role for service-role created users (e.g., check `auth.role()` or a guarded metadata key). |
| D7 | **P1** | `supabase/migrations/0002_rls_policies.sql` L64–65 | `profiles: any authenticated reads basic` exposes every profile to every employee (email, role, manager_id, etc.). | Narrow to id+full_name+department for non-managers; keep richer fields for managers/admins. |
| D8 | **P1** | Multiple tables | Audit triggers missing on `profiles`, `cycles`, `unlock_requests`, `checkin_comments`, `escalation_rules`, `escalation_log`. | Add audit triggers in `0011_perf_indexes.sql` (and audit triggers). |
| D9 | **P1** | `lib/scoring/compute-score.ts` L58–59 vs `0004_views_functions.sql` L106–111 | `computeSheetScore` returns `null` when all scores null; SQL `coalesce(...,0)` returns 0. | TS already canonical; SQL function not used. Note divergence in code comment. |
| D10 | **P2** | `supabase/migrations/0001_enums_tables.sql` | Audit-log composite index missing for hot lookup `(entity_type, entity_id) ORDER BY created_at DESC`. | New index in `0011_perf_indexes.sql`. |
| D11 | **P2** | `unlock_requests` | No index on `goal_sheet_id`. | Add. |
| D12 | **P2** | `escalation_log` | No partial index for open rows. | `(rule_id) WHERE resolved_at IS NULL`. |
| D13 | **P2** | `supabase/seed.sql` | No `auth.identities` rows alongside seeded `auth.users` — login may fail on newer Supabase. | Insert matching identity rows. |
| D14 | **P2** | `supabase/migrations/0001_enums_tables.sql` L127 | No SQL enforcement of 8-goal limit or 100% weightage total. | Optional: trigger `enforce_sheet_weightage` on insert/update (deferred). |

---

## 6. Shared UI & cross-cutting

### Strengths

- Solid dashboard shell: server-fetched profile, sticky topbar/sidebar, `NavProgress`, global `Toaster`.
- Consistent page primitives: `PageHeader`, `EmptyState`, `CycleBanner`, `GoalStatusBadge`, `PageLoading`.
- All pages use `@/` aliases; no relative imports.
- All `page.tsx` are server components; interactivity lives in `*-form/-controls.tsx`.

### Findings

| # | Sev | Where | Issue | Fix |
|--:|----|-------|-------|-----|
| U1 | **P1** | `components/layout/sidebar.tsx` L136–138 + `components/layout/mobile-nav.tsx` L42–81 + `components/command-palette.tsx` L40–81 | Three duplicate nav configs. `startsWith` causes dual-active (`/team` + `/team/approvals`). | Extract `lib/navigation.ts`; longest-prefix-wins. Add `/admin/escalation` to palette. |
| U2 | **P1** | `app/(dashboard)/layout.tsx` | No skip-to-content link. | Add. |
| U3 | **P1** | `components/layout/notifications-bell.tsx` L151 | `<li onClick>` not keyboard accessible. | Convert to `<button>` rows. |
| U4 | **P1** | `components/goals/share-goal-dialog.tsx` L129 | Icon trigger uses `title`, not `aria-label`. | Add `aria-label`. |
| U5 | **P1** | `components/layout/theme-toggle.tsx` L11–19 | Only light/dark — no "system" option even though provider has `enableSystem`. | Add three-way dropdown. |
| U6 | **P1** | `components/layout/breadcrumbs.tsx` L7–26 | `LABELS` missing `escalation`, `assign-goals`, `update-password`, UUID segments. | Extend map; handle UUID generically. |
| U7 | **P1** | `app/not-found.tsx` | Always links to `/dashboard` — wrong for signed-out users. | Read auth state; show `/login` link when no session. |
| U8 | **P1** | `app/(auth)/` | No `error.tsx` boundary. | Add. |
| U9 | **P2** | `components/empty-state.tsx` L7 | `className` prop declared but never applied. | Apply or remove. |
| U10 | **P2** | `components/submit-button.tsx` | Exported but never used. | Remove. |
| U11 | **P2** | `components/status-badge.tsx` L84–108 | `AchievementStatusBadge`, `CyclePhaseLabel` defined but never imported. | Remove unused exports. |
| U12 | **P2** | `components/ui/popover.tsx`, `components/ui/separator.tsx` | Zero imports. | Delete files; uninstall Radix peers. |
| U13 | **P2** | `components/ui/button.tsx` L20–21 | Custom `success`, `warning` variants — zero usages. | Drop variants or document. |
| U14 | **P2** | `components/ui/command.tsx` L116–118 | `CommandShortcut` exported, never used. | Remove. |
| U15 | **P2** | `package.json` L17, L46 | `react-hook-form`, `@hookform/resolvers` deps with no imports. | Uninstall. |
| U16 | **P2** | App-wide | Date formatting inconsistent across `toLocaleDateString` variants, `formatDistanceToNow`, `format`. | Extract `lib/format/date.ts`. |
| U17 | **P2** | `app/(dashboard)/reports/achievement/achievement-report.tsx` L4–5 | `xlsx` + `papaparse` always bundled. | Lazy `await import()` in export handler. |
| U18 | **P2** | `app/(dashboard)/analytics/analytics-charts.tsx`, `app/(dashboard)/reports/completion/completion-charts.tsx`, `app/(dashboard)/analytics/employee-drilldown.tsx` | Recharts always bundled in client. | `next/dynamic({ ssr: false })`. |
| U19 | **P2** | Forms | Label/`htmlFor` and `aria-invalid` missing across `goal-card.tsx`, `profile-form.tsx`, `thrust-area-controls.tsx`, `share-goal-dialog.tsx`, `signup-form.tsx`, `checkin-form.tsx`. | Wire `id`/`htmlFor`; set `aria-invalid` when errored. |

### Toast policy gaps

- Generic `toast.error(r.error ?? "Failed")` dominates (~15 files).
- `ThrustAreaToggle`, `RuleToggle`, users-table switches — no success toast on toggle paths.
- Achievement / Audit exports — silent (no success toast).

---

## 7. Severity index

### P0 — security & breaking bugs (must-fix)

1. A1 — Open signup privilege escalation
2. A2 — Auth-without-profile redirect loop
3. A3 — Deactivated user still reaches dashboard
4. A4 — Missing `/update-password` page
5. E1 — Returned sheets cannot resubmit after phase ends
6. E2 — "Edit & resubmit" link to blocked `/goals/new`
7. E3 — Draft save can violate DB CHECK
8. M1 — Admin approvals queue includes managers/admins
9. M2 — Manager assign vs employee calendar mismatch
10. M3 — Assign-goals creates draft on GET
11. AD1 — Achievement report ignores selected cycle
12. AD2 — Completion "haven't submitted" lists everyone
13. AD3 — Unlock request partial-failure
14. AD4 — No self-demotion guard
15. D1 — `shared_goal_recipients` view bypasses RLS
16. D2 — `audit_log` insert spoofable
17. D3 — `notifications` insert for any user_id
18. D4 — `goal_sheets.status` self-promotion via RLS gap
19. D5 — `profiles` self-update over-permissive
20. D6 — `handle_new_user` honors client role

### P1 — UX & state correctness

A5–A10, E4–E6, M4–M10, M12, AD5–AD15, U1–U8, D7–D9.

### P2 — A11y / dead code / perf / polish

A11–A14, E7–E11, M11, AD16–AD19, U9–U19, D10–D14.

---

## 8. Scoping decisions

Out-of-scope for this audit/fix engagement:

- Production deployment / Vercel config.
- Real Resend email + Teams webhook integration (left behind env flags).
- I18n.
- New product features.

---

*Audit reflects state of `c:\Users\Admin\OneDrive\Desktop\AtomQuest` at the time of writing. Findings are cited; all later phases of this engagement reference this document.*
