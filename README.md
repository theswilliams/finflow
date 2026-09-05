# FinFlow

A calm, premium personal-finance dashboard — transaction categorization, spending
insights, budgets, and savings goals. Built to feel like a real consumer fintech
product rather than a CRUD dashboard.

**▶ Live demo: <https://finflow-cyan-theta.vercel.app>** — opens straight into a
seeded demo, no sign-up. (Accounts + cloud sync also work; see [Auth](#auth).)

[![CI](https://github.com/theswilliams/finflow/actions/workflows/ci.yml/badge.svg)](https://github.com/theswilliams/finflow/actions/workflows/ci.yml)
&nbsp;Next.js 16 · React 19 · TypeScript · Tailwind v4 · Supabase · Recharts · Vitest

## What this demonstrates

- **Domain modelling** — a normalized schema with RLS, integer-cents money
  throughout, transfers that don't count as spend, month-over-month math, budget
  projection.
- **A real categorization engine** — ~130 built-in Canadian merchants + user rules
  with priority and match operators, whole-token matching, applied automatically to
  new and imported transactions without ever overriding a manual choice.
- **A CSV import pipeline** — column auto-detection, preview, multi-format date
  parsing, and content-hash duplicate detection.
- **A clean persistence seam** — one `useStore()` surface backs three runtime modes
  (guest / local / Supabase) with optimistic writes; no component knows which is
  active.
- **SSR auth** done properly — `@supabase/ssr`, cookie-based sessions, middleware
  session refresh, a full password-reset flow, graceful error boundaries.
- **Tested core** — 65 Vitest cases over the money/finance/categorization/CSV logic,
  run in CI alongside lint and `tsc`.
- **Design** — a token-based system, light/dark, responsive to mobile, restrained
  data-viz where colour carries meaning.

## Screenshots

| | |
| --- | --- |
| ![Dashboard](docs/dashboard.png) | ![Dashboard — dark](docs/dashboard-dark.png) |
| **Dashboard** — net cash flow, account balances, running-total spend, budgets | **Dark mode** — same view, viewer's theme |
| ![Transactions](docs/transactions.png) | ![Insights](docs/insights.png) |
| **Transactions** — search, filters, inline re-categorization, review flags | **Insights** — trends, category lines, top merchants, recurring detection |

## Stack

- **Next.js 16** (App Router) + **React 19** + **TypeScript**
- **Tailwind CSS v4** with a token-based design system (`src/app/globals.css`)
- **Radix UI** primitives (hand-styled in `src/components/ui`) — the shadcn/ui approach
- **Recharts 3** for all data visualization
- **lucide-react** icons
- **Zod** + **React Hook Form** for forms and validation
- **PapaParse** for CSV import
- **Supabase** (`@supabase/ssr`) — auth + Postgres, schema in `supabase/migrations`

## Running

```bash
npm install
npm run dev
```

Open http://localhost:3000. With no Supabase env vars this runs in local mode and
seeds ~300 realistic transactions across 6 months on first load, so every screen is
populated immediately. Sample data is clearly labelled and can be reset or cleared
from **Settings → Your data**.

```bash
npm test          # Vitest — finance math, categorization, CSV parsing, filters
npm run lint
npm run build
```

All three are clean, and CI (`.github/workflows/ci.yml`) runs them on every push and PR.

## Auth

The deployed app has Supabase configured, so it supports three runtime modes:

| Mode | How you get there | Data lives |
| --- | --- | --- |
| **guest** | default for anyone not signed in — `/demo` sets a cookie, the sidebar offers "create an account" | this browser (`localStorage`), seeded |
| **local** | no Supabase env vars at all | this browser, seeded |
| **supabase** | signed in | Postgres, RLS-scoped to the user |

Guest status is resolved on the server and passed into the store, so SSR and the
first client render agree.

Email + password, with a full recovery path:

- `/login` · `/signup` (each also links to the demo)
- **`/forgot-password`** → reset link → `/auth/callback` exchanges the code →
  **`/reset-password`**. `RecoveryRedirect` also catches a recovery session that
  lands on any other page (e.g. the bare Site URL) and routes it there.
- `/auth/sign-out`, `/exit-demo`

New Supabase projects have email confirmation on by default; turn it off in the
Supabase dashboard (Authentication → Providers → Email) or keep it — users confirm
via the same callback route.

## Error handling & observability

- `error.tsx` / `global-error.tsx` / `not-found.tsx` — graceful, on-brand fallback UI
- `src/instrumentation.ts` `onRequestError` — every server-side error
- `ErrorReporter` — client `unhandledrejection` / `window.onerror`
- All of it funnels through `captureError()` in `src/lib/observe.ts`, which today
  emits a structured JSON line Vercel captures in function logs. To send to Sentry:
  `npx @sentry/wizard@latest -i nextjs`, then add one line at the marked spot in
  `observe.ts` — every call site already routes through it.

## Deployment

Hosted on Vercel, GitHub-connected — pushes to `master` ship to production, other
branches / PRs get preview URLs. Supabase was provisioned through the Vercel
Marketplace integration, which injects the env vars; migrations are applied with
`supabase db push`.

## Data layer

The domain model and all financial logic live in `src/lib` and are completely
UI-agnostic:

| Area | Location |
| --- | --- |
| Types | `src/lib/types.ts` |
| Money (integer cents, formatting) | `src/lib/finance/money.ts` |
| Calculations (cash flow, balances, budgets) | `src/lib/finance/calculations.ts` |
| Insights (recurring, anomalies, merchants) | `src/lib/finance/insights.ts` |
| Rule-based categorization engine | `src/lib/categorization/engine.ts` |
| CSV parsing + duplicate detection | `src/lib/csv.ts`, `src/lib/finance/hash.ts` |
| Demo data generator | `src/lib/seed.ts` |

**All money is integer cents.** Formatting to `$` happens only at the presentation
layer (`formatMoney`). Transfers never count as income or expense.

State is served through a single `useStore()` hook (`src/lib/store.tsx`). Every
mutation updates local React state immediately (optimistic) and, in `supabase`
mode, write-throughs to Postgres in the background via
`src/lib/supabase/repository.ts` — a failed write raises a toast. The provider
method surface (`addTransaction`, `upsertBudget`, …) is identical across guest,
local, and supabase modes, so no component knows or cares which is active.

The store also owns the **reference clock** (`src/lib/finance/dates.ts` →
`now()` / `setReferenceDate`): the demo dataset pins "today" to the end of a
complete month so every screen looks full, while real accounts use the system
clock. `viewMonth` (the dashboard/budgets month picker) derives from it.

### Enabling Supabase auth + persistence

1. Create a Supabase project and run `supabase/migrations/0001_init.sql` in the SQL
   editor — normalized schema, UUID PKs, `created_at`/`updated_at` triggers,
   trigram + partial indexes, and **Row Level Security on every table** (a user can
   only ever touch rows where `user_id = auth.uid()`). A `profiles` row and the 14
   system categories are created automatically.
2. `cp .env.example .env.local` and fill in `NEXT_PUBLIC_SUPABASE_URL` and
   `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
3. Restart `npm run dev`. You now get:
   - `/login` and `/signup` (email + password), the recovery flow, and guest mode
   - `src/proxy.ts` (Next 16 middleware) refreshes the session on every request;
     unauthenticated visitors are dropped into the demo rather than a login wall
   - `(app)/layout.tsx` re-checks auth server-side
   - new accounts start empty with an "explore with sample data" option that seeds
     the demo dataset into their own rows
   - the account menu at the bottom of the sidebar (sign out, or convert a guest)

Schema notes: `transactions.tags` is a `text[]` (free-form labels, not shared
entities), and category is referenced by stable `slug` rather than a FK, since the
product ships a fixed set of 14 categories — both choices keep the row↔domain
mapping trivial. Bank integrations (Plaid etc.) are deliberately not implemented;
`accounts` is modelled so an aggregation provider can be added without schema
changes.

## Feature map

| Route | What it does |
| --- | --- |
| `/dashboard` | Month picker, net cash flow vs last month, account balances, spending overview (cumulative / weekly / monthly), category donut + ranked list, budget progress, recent transactions |
| `/transactions` | Sortable/filterable table (search, category, account, type, amount, date, review status), inline re-categorization, bulk toolbar, detail drawer, URL-driven filters |
| `/transactions/import` | 4-step CSV wizard: upload → column mapping (auto-detected) → preview → import, with duplicate detection and a downloadable sample |
| `/review` | Fast keyboard-first queue for low-confidence transactions (`1–0` to categorize, `Enter` to keep, `U` to undo) |
| `/budgets` | Monthly per-category budgets with healthy / near-limit / over states, projected month-end, summary |
| `/insights` | Spending trends (3/6/12 mo), toggleable category trend lines, biggest categories, top merchants, recurring-expense detection with annual estimates, conservative anomaly flags |
| `/goals` | Savings goals with progress visualization and required monthly contribution |
| `/settings` | Accounts, custom categorization rules, export/import/reset data |

## Design system

Neutral charcoal/slate foundation, restrained borders and shadows, tabular figures
for every number. Colour carries meaning only: green = positive cash flow, red =
negative, amber = budget warning. Category hues are muted and harmonious. Full
light/dark support via `next-themes` with tokens redefined for `prefers-color-scheme`
and an explicit `[data-theme]` override.
