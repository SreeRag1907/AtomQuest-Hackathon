# AtomQuest Portal

Enterprise goal-setting and performance tracking — built end to end on **Next.js 15 (App Router)** + **Supabase** with audit-grade governance baked into the database layer.

## Highlights

- **Role-based** workflows (Employee / Manager / Admin) with **RLS-enforced** access at the database level
- **Goal sheets** with up to 8 goals, weightages totaling 100%, mixed UoM types, and a sticky validation bar that gates submission live
- **Phase-gated cycle**: goal-setting → Q1 → Q2 → Q3 → Q4/annual → closed (admin can advance manually for demos)
- **Quarterly check-ins** with a centralized scoring engine shared between client UI and Postgres functions
- **Manager review** with approve / return-with-reason actions and lock semantics enforced via RLS
- **Audit trail** captured by **Postgres triggers** on `goal_sheets`, `goals`, and `achievements` — application code can never forget to log
- **Reports**: achievement (filterable + CSV export) and completion (charts + drill-down)
- **Analytics**: KPI cards, QoQ trends, donut + bar + stacked distributions, department × quarter heatmap, manager effectiveness, employee drill-down
- **Escalation engine**: configurable SLA rules (goals not submitted / not approved / check-in pending) with manual `Run check now` and per-rule notify toggles for employee / manager / HR
- **Microsoft Teams Adaptive Cards** (bonus): wired to **`TEAMS_WEBHOOK_URL`** — code posts cards next to emails; **this hackathon submission does not configure a webhook** (org Teams incoming webhooks aren’t available on consumer / Communities-only clients)
- **Microsoft Entra SSO** (bonus): **`/login` + `/auth/callback`** PKCE sync; **`AZURE_GROUP_*` role mapping requires Entra groups with members + optional `groups` claim** — **not populated in our demo tenant**, so judges should use **seeded email/password roles** (`@atomquest.demo`); SSO remains optional infra
- **Stretch bonuses**: Resend email templates (optional `RESEND_API_KEY`; verify a sender domain at Resend) and a `⌘K` / `Ctrl+K` command palette

## Tech stack

- **Framework**: Next.js 15 (App Router, RSC, Server Actions)
- **Backend**: Supabase (Postgres, RLS, Auth, Realtime)
- **Validation**: zod + react-hook-form patterns
- **UI**: TailwindCSS + custom shadcn/ui primitives + lucide-react
- **Charts**: Recharts
- **Tables**: TanStack Table-ready via shadcn `Table` primitive
- **Toasts**: sonner
- **Email** (optional): Resend

## Prerequisites

- Node 18.18+ and pnpm or npm
- A Supabase project (cloud or local via Supabase CLI)

## Setup

```bash
# 1. Install dependencies
npm install        # or: pnpm install / yarn install

# 2. Copy env template and fill in your Supabase project credentials
cp .env.local.example .env.local
# Then edit .env.local and set:
#   NEXT_PUBLIC_SUPABASE_URL
#   NEXT_PUBLIC_SUPABASE_ANON_KEY
#   SUPABASE_SERVICE_ROLE_KEY
#   NEXT_PUBLIC_SITE_URL=http://localhost:3000
#   (optional) RESEND_API_KEY, RESEND_FROM_EMAIL

# 3. Apply database migrations + seed
#    Option A: Supabase CLI (cloud project)
supabase link --project-ref <your-ref>
supabase db push                        # applies supabase/migrations/*.sql
psql "$SUPABASE_DB_URL" -f supabase/seed.sql

#    Option B: Local Supabase
supabase start
supabase db reset                       # runs migrations + seed.sql automatically

# 4. Start the dev server
npm run dev
# → http://localhost:3000
```

## Demo credentials

> Password for **all** seeded accounts: `Atomquest!2026`

| Role     | Email                          | Notes                                      |
|----------|--------------------------------|--------------------------------------------|
| Admin    | `admin@atomquest.demo`         | Cycle controls, audit log, all reports     |
| Manager  | `maya.patel@atomquest.demo`    | Engineering — has approvals to review      |
| Manager  | `rohan.verma@atomquest.demo`   | Sales                                      |
| Manager  | `sara.chen@atomquest.demo`     | Customer Success                           |
| Employee | `priya.iyer@atomquest.demo`    | Locked sheet, full Q1 actuals              |
| Employee | `arjun.rao@atomquest.demo`     | Submitted, pending Maya's review           |
| Employee | `devika.shah@atomquest.demo`   | Returned (low weightage on goal #2)        |

The login screen has demo-cred quick-fill cards — one click signs you in.

### Hackathon submission: Teams + Azure AD (what’s wired vs skipped)

BRD Phase 1/2 demos use **nothing below** — they’re Section 5 “good-to-have” only:

| Integration | Repo status | Submitted hackathon demo |
|-------------|-------------|---------------------------|
| **Teams** | `sendTeamsCard` + Adaptive templates in `lib/teams/` — **noop** without `TEAMS_WEBHOOK_URL` | **Not configured.** No Incoming Webhook URL (typical blocker: Communities-only Teams or org policy).
| **Entra groups → role** | `AZURE_GROUP_ADMIN/MANAGER/EMPLOYEE` + `/auth/callback` sync (`lib/auth/entra-sync.ts`) | **`AZURE_GROUP_*` IDs may set; Azure groups aren’t populated with demo members** → role-from-groups inactive; SSO users default to **`employee`** until `/admin/users` or future IAM rollout.
| **Microsoft sign-in** | Enable Azure provider in Supabase + redirect URI per README | Optional; credentials for judges remain **three seeded accounts**.

**Evaluators:** All role journeys are proven with **`admin@atomquest.demo`, `maya.patel@atomquest.demo`, seeded employees**, password **`Atomquest!2026`** — see Demo credentials above.

## Demo walkthrough

1. **Login** as Admin → open `/admin/cycles` → Active cycle is in `q2` phase
2. **Switch to Maya (Manager)** → `/team/approvals` shows Arjun + Noah pending → review and approve one, return the other with a reason
3. **Switch to Priya (Employee)** → `/check-ins` is open for Q2 → fill in actuals, watch live score badges update → save
4. **Switch back to Admin** → `/admin/audit-log` → expand any row to see field-level JSON diff
5. **Hit ⌘K** anywhere to navigate fast
6. **`/analytics`** for the management overview

## Architecture

```
Next.js 15 (App Router)
├── (auth) — split-screen login/signup with demo cred cards
└── (dashboard)
    ├── layout.tsx           — sidebar + topbar shell, RLS-aware nav
    ├── dashboard/           — role-aware home (employee / manager / admin variants)
    ├── goals/               — list + new + detail (+ server actions)
    ├── team/                — roster + approvals + per-member detail
    ├── check-ins/           — current quarter + history
    ├── admin/               — cycles, users, thrust areas, audit log, unlock requests, escalation
    ├── reports/             — achievement (CSV) + completion (charts)
    ├── analytics/           — full management analytics page
    └── settings/            — profile, theme, notification prefs

lib/
├── supabase/{client,server,middleware}.ts — @supabase/ssr canonical pattern
├── scoring/compute-score.ts               — UoM-aware scoring engine (mirrored in SQL)
├── validations/goal.ts                    — zod schemas (re-validated server-side)
├── cycle.ts                               — phase helpers
├── email/                                 — Resend templates (graceful when no key)
├── teams/                                 — Optional Teams Adaptive Cards (webhook URL)
├── auth/entra-sync.ts                     — SSO metadata → profile role / reporting line helpers
└── utils.ts                               — cn, initials, formatPercent

supabase/
├── migrations/0001_enums_tables.sql       — full schema (enums, 8 core tables)
├── migrations/0002_rls_policies.sql       — role + lock enforcement at DB layer
├── migrations/0003_audit_triggers.sql     — generic audit_trigger_fn + handle_new_user
├── migrations/0004_views_functions.sql    — compute_score(), helpers, views
├── migrations/0005_shared_goals.sql       — shared KPI triggers + recipients view
├── migrations/0006_escalation.sql         — escalation_rules + escalation_log + RLS
└── seed.sql                               — 1 admin + 3 managers + 12 employees
```

## Key non-obvious decisions

- **Audit logging via Postgres triggers** — the `audit_trigger_fn()` runs on every write to watched tables, so application code can never forget to log. The trigger captures `OLD` and `NEW` as JSONB so the audit drawer can show field-level diffs.
- **Lock enforcement in RLS, not application code** — the `goal_sheets: employee updates own (not locked)` policy blocks any write to a locked sheet at the database level. Even a misbehaving server action can't bypass it.
- **Cycle phase gating in server actions** — `submitForApproval` reads `cycles.current_phase` and refuses outside `goal_setting`. The check-in action does the same for Q1–Q4.
- **Single `useGoalSheetValidation` hook** drives both UI feedback (red borders, weightage bar color, submit-disabled tooltip) and the gating logic, then `goalSheetInputSchema` re-runs on the server.
- **Manual phase advance in admin UI** is the demo lever. In production this would be a `pg_cron` job that fires on the configured `q2_opens` etc dates — keep this as a talking point for governance reviews.
- **Scoring duplicated in SQL** (`public.compute_score`) so report views and RPCs can stay aggregated in the database, away from `n*4` round trips.
- **Shared KPIs via DB triggers** (`0005_shared_goals.sql`) — a manager pushes a goal to multiple employees; each gets a child row locked to the parent's `uom/target/title`. Achievements entered by the parent fan-out to all children via a `SECURITY DEFINER` trigger, and child writes are blocked at trigger depth. Recipients can only adjust their own weightage.
- **Manager inline edits during review** — `managerUpdateGoals` lets a manager tweak targets/weightage on a submitted sheet without forcing a return loop, with full audit logging.
- **Stale-session handling in middleware** — `refresh_token_not_found` errors clear `sb-*` cookies on the redirect response and reduce console spam to a single `[auth]` warning line.
- **Rule-driven escalation engine** (`0006_escalation.sql`) — admin-managed `escalation_rules` are evaluated on demand by `runEscalationCheck`, deduped via a unique partial index `(rule_id, employee_id, fired_at::date) where resolved_at is null`. Each fire emits in-app notifications, an optional Resend email when configured, and (if `TEAMS_WEBHOOK_URL` is set) a Teams Adaptive Card.
- **Teams Adaptive Cards** — `lib/teams/index.ts` posts to Incoming Webhooks when `TEAMS_WEBHOOK_URL` is set; **otherwise no-op**. This submission leaves the URL unset.
- **Entra group→role mapping** (`AZURE_GROUP_*`) activates only when JWT `groups` intersects mapped Object IDs — **hackathon tenants may leave groups empty**; full role demos use seeded Supabase passwords; `app/auth/callback/route.ts` still syncs metadata on SSO per `lib/auth/entra-sync.ts`.

## Microsoft Entra (Azure AD) SSO setup

The Microsoft sign-in button on `/login` is wired to the standard Supabase OAuth PKCE flow. No app code changes are needed once Supabase is configured — the work is on the Supabase + Entra side.

1. **Azure portal** → App registrations → **New registration**.
   * Redirect URI: `https://<your-supabase-ref>.supabase.co/auth/v1/callback`
   * Front-channel logout: `https://your-app/login`
2. **Certificates & secrets** → New client secret → copy the **Value**.
3. **Token configuration** → Add optional claim → `groups` (Group ID) for ID + Access tokens. This is what powers role mapping.
4. **API permissions** → Microsoft Graph → `User.Read`, `email`, `openid`, `profile`, `offline_access`. Grant admin consent.
5. **Supabase Dashboard** → Authentication → Providers → **Azure** → enable, paste the Application (client) ID, Directory (tenant) ID, and Client Secret.
6. Create three Entra groups (e.g. `AtomQuest-Admin`, `AtomQuest-Manager`, `AtomQuest-Employee`) and copy their Object IDs into `AZURE_GROUP_ADMIN`, `AZURE_GROUP_MANAGER`, `AZURE_GROUP_EMPLOYEE` in `.env.local`.
7. Add target users to the right groups; sign in via Microsoft on `/login` and the profile row is created/updated with the correct role automatically.

If **group env vars are blank** or **`groups`** never arrives in JWT, or **nobody sits in mapped Entra groups**, SSO still works — new users behave like **`employee`** until admins adjust `/admin/users` (same behaviour as omitting mappings).

### Checklist (BRD §5.1 Microsoft Entra)

| Capability | What you do | Notes |
|------------|--------------|-------|
| **SSO for employees/managers** | Enable **Azure** in Supabase, register an Entra **Web** app redirecting to **`https://<ref>.supabase.co/auth/v1/callback`**, paste Client ID, tenant URL, secret | Uses `/login` → **Sign in with Microsoft** and `app/auth/callback` PKCE completion |
| **Role from Azure AD groups** | Create groups (Admin / Manager / Employee), expose **`groups`** as optional claims (group **Object IDs**), set **`AZURE_GROUP_ADMIN`**, **`AZURE_GROUP_MANAGER`**, **`AZURE_GROUP_EMPLOYEE`** in `.env.local` | On each SSO sign-in we map group membership → `profiles.role`. Verify after first login: Supabase Dashboard → Authentication → Users → **user_metadata / raw_app_meta_data** contains a `groups` array |
| **Reporting line (`manager_id`)** | Ensure the identity token exposes the manager address as **`manager_email`**, **`manager_upn`**, or **`reports_to_mail`** inside metadata Supabase merges into `user.user_metadata` (claims mapping / directory extension / SSO attribute — tenant-specific). **Seed or provision the manager’s user first** so `profiles.email` matches that value exactly | AtomQuest resolves the manager FK by **`profiles.email`**. If claims are absent, SSO still works — keep assigning managers manually or via `/admin/users` |

**Tip:** Personal Microsoft accounts will not populate corporate `department`/`groups`; use work accounts aligned with Entra claims.

## Deploy

```bash
# Push to GitHub then import on Vercel
# Set env vars on Vercel: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
# SUPABASE_SERVICE_ROLE_KEY, NEXT_PUBLIC_SITE_URL,
# (optional) RESEND_API_KEY, RESEND_FROM_EMAIL
# (optional) TEAMS_WEBHOOK_URL — unset in hackathon submission; see "Hackathon submission" above.
# (optional) AZURE_GROUP_ADMIN/MANAGER/EMPLOYEE — IDs may exist; demo groups unpopulated; judges use seeded logins.
# Build command: npm run build
# Output:        .next
```

## Scripts

| Script            | Action                                        |
|-------------------|-----------------------------------------------|
| `npm run dev`     | Local dev server                              |
| `npm run build`   | Production build                              |
| `npm run start`   | Start production build                        |
| `npm run lint`    | ESLint                                        |
| `npm run typecheck` | `tsc --noEmit`                              |
| `npm run db:reset`  | `supabase db reset` (re-runs migrations + seed) |
| `npm run db:push`   | `supabase db push` (apply migrations to remote) |
