# FinFlow

A calm, premium personal-finance dashboard — transaction categorization, spending
insights, budgets, and savings goals. Built to feel like a real consumer fintech
product rather than a CRUD dashboard.

Canadian merchants, CAD currency, dark mode from the start.

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

Open http://localhost:3000. The app seeds ~300 realistic transactions across 6
months on first load, so every screen is populated immediately. Sample data is
clearly labelled and can be reset or cleared from **Settings → Your data**.

`npm run build` produces a clean production build; `npm run lint` is clean.

## Deployment

Hosted on Vercel: <https://finflow-cyan-theta.vercel.app>. The GitHub repo is
connected, so pushes to `master` deploy to production and other branches / PRs get
preview URLs. With no Supabase env vars set the deployment runs in local mode
(per-browser demo data); add the two `NEXT_PUBLIC_SUPABASE_*` vars in the Vercel
project settings to turn on auth + persistence.

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

State is served through a single `useStore()` hook (`src/lib/store.tsx`). It runs in
one of two modes, decided at runtime by whether the Supabase env vars are present:

| Mode | Persistence | Auth |
| --- | --- | --- |
| `local` (default) | `localStorage`, seeded with demo data | none |
| `supabase` | Postgres via `src/lib/supabase/repository.ts` | required |

Every mutation updates local React state immediately (optimistic) and, in
`supabase` mode, write-throughs to Postgres in the background — a failed write
raises a toast. The provider method surface (`addTransaction`, `upsertBudget`, …)
is identical in both modes, so no component knows or cares which is active.

### Enabling Supabase auth + persistence

1. Create a Supabase project and run `supabase/migrations/0001_init.sql` in the SQL
   editor — normalized schema, UUID PKs, `created_at`/`updated_at` triggers,
   trigram + partial indexes, and **Row Level Security on every table** (a user can
   only ever touch rows where `user_id = auth.uid()`). A `profiles` row and the 14
   system categories are created automatically.
2. `cp .env.example .env.local` and fill in `NEXT_PUBLIC_SUPABASE_URL` and
   `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
3. Restart `npm run dev`. You now get:
   - `/login` and `/signup` (email + password; email-confirmation flow via
     `/auth/callback`)
   - `src/proxy.ts` (Next 16 middleware) refreshes the session on every request and
     redirects unauthenticated users to `/login`
   - `(app)/layout.tsx` re-checks auth server-side
   - new accounts start empty with an "explore with sample data" option that seeds
     the demo dataset into their own rows
   - sign-out from the account menu at the bottom of the sidebar

Schema notes: `transactions.tags` is a `text[]` (free-form labels, not shared
entities), and category is referenced by stable `slug` rather than a FK, since the
product ships a fixed set of 14 categories — both choices keep the row↔domain
mapping trivial. Bank integrations (Plaid etc.) are deliberately not implemented;
`accounts` is modelled so an aggregation provider can be added without schema
changes.

## Feature map

| Route | What it does |
| --- | --- |
| `/dashboard` | Net cash flow vs last month, account balances, spending overview (daily/weekly/monthly), category donut + ranked list, budget progress, recent transactions |
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
