# AtomQuest

Enterprise goal-setting and performance portal built with **Next.js 15** (App Router) and **Supabase** (PostgreSQL, Auth, RLS). Goals, approvals, check-ins, and audit history are enforced at the database layer.

## Features

- **Roles**: Employee, Manager, and Admin with row-level security on sensitive data
- **Cycles**: Phases from goal-setting through quarters to close; admins control phase and active cycle
- **Goal sheets**: Up to eight goals per cycle, weightings totaling 100%, multiple units of measure, validation on draft and submit
- **Manager workflow**: Review queue, approve/return with reason, inline edits on submitted sheets, **assign goals** for direct reports during goal-setting (`/team/[employeeId]/assign-goals`); employees submit for approval from **My goals**
- **Check-ins**: Quarterly actuals with shared scoring logic in the app and SQL
- **Reports & analytics**: Achievement and completion reports; analytics dashboards (**org-wide for admins**, **team-scoped for managers**, **self-scoped for employees**)
- **Governance**: Audit logging via database triggers, unlock requests, configurable escalation rules
- **Optional**: Resend email, Microsoft Teams webhooks (adaptive cards), Microsoft Entra sign-in via Supabase (with optional group → role mapping)

## Tech stack

| Area | Choice |
|------|--------|
| App | Next.js 15, React 18, TypeScript, Server Actions |
| UI | Tailwind CSS, shadcn/ui, Lucide |
| Data | Supabase Postgres, `@supabase/ssr`, RLS policies |
| Validation | Zod |
| Charts | Recharts |

## Prerequisites

- **Node.js** 18.18+ / 20+
- **npm**, pnpm, or yarn
- A **Supabase** project (cloud or local via [Supabase CLI](https://supabase.com/docs/guides/cli))

## Getting started

```bash
npm install
cp .env.local.example .env.local
# Edit .env.local: Supabase URL, anon key, service role key, NEXT_PUBLIC_SITE_URL

# Apply schema (cloud: link project first; local: supabase start)
supabase db push
# Or reset local DB including seed:
npm run db:reset

npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment variables

Copy **`.env.local.example`** to `.env.local`. Required values:

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role (admin invites, server-only operations) |
| `NEXT_PUBLIC_SITE_URL` | Canonical app URL (auth redirect links) |

Optional: `RESEND_*`, `TEAMS_WEBHOOK_URL`, Azure group IDs for SSO role mapping — see comments in `.env.local.example`.

For **local development** when Supabase auth email rate limits block invites or sign-up, you can set `AUTH_DEV_CREATE_USER_WITHOUT_EMAIL=true` (see example file). **Do not enable in production.**

## Database

SQL migrations live in **`supabase/migrations/`** (schema, RLS, audit triggers, views, shared goals, escalation). **`supabase/seed.sql`** provides demo users and sample data.

```bash
npm run db:push    # apply migrations to linked remote
npm run db:reset   # local: migrations + seed
```

## Demo accounts

Seeded password for all demo users: **`Atomquest!2026`**

| Role | Email | Suggested exploration |
|------|-------|------------------------|
| Admin | `admin@atomquest.demo` | Cycles, users, audit log, escalation |
| Manager | `maya.patel@atomquest.demo` | Team, approvals, assign goals |
| Employee | `priya.iyer@atomquest.demo` | My goals, check-ins |

Additional managers and employees are listed in `supabase/seed.sql`. The login page includes quick-fill shortcuts for common demo accounts.

## Project structure

```
app/
  (auth)/          # Login, sign-up, auth callback
  (dashboard)/     # Dashboard, goals, team, check-ins, admin, reports, analytics, settings
lib/
  supabase/        # Browser + server Supabase clients, middleware
  validations/     # Zod schemas (e.g. goals)
  scoring/         # Achievement scoring (aligned with SQL helpers)
  email/, teams/   # Optional outbound notifications
components/        # Shared UI
supabase/migrations/
supabase/seed.sql
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run start` | Run production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run db:reset` | Local Supabase reset (migrations + seed) |
| `npm run db:push` | Push migrations to linked remote |

## Deployment

Deploy on **Vercel** (or any Node host): set the same environment variables as production, point `NEXT_PUBLIC_SITE_URL` at the deployed origin, and configure Supabase Auth redirect URLs for that host. Enable the Azure auth provider in Supabase if you use Microsoft sign-in.

## Optional: Microsoft Entra (Azure AD) SSO

1. Register an app in Entra and add Supabase’s redirect URI: `https://<project-ref>.supabase.co/auth/v1/callback`.
2. In **Supabase → Authentication → Providers**, enable **Azure** and add client ID, secret, and tenant.
3. Optionally expose **`groups`** in tokens and set `AZURE_GROUP_ADMIN`, `AZURE_GROUP_MANAGER`, `AZURE_GROUP_EMPLOYEE` in `.env.local` to map directory groups to app roles. If groups are not mapped, new SSO users default to **employee** until an admin updates **Users**.

Details vary by tenant; see [Supabase SSO with Azure](https://supabase.com/docs/guides/auth/social-login/auth-azure).
