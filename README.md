# Lunelle

**Understand Your Cycle.** — *Your cycle, your insights, your privacy.*

Lunelle is a private, mobile-first web app for tracking menstrual periods, cycle phases, estimated ovulation and fertile window, symptoms, mood and intimacy. It is built with React, Vite, TypeScript and Tailwind CSS on top of Supabase (Auth, PostgreSQL and Row Level Security).

> **Medical safety.** Lunelle is an informational tracking and estimation tool. It is **not** a medical device, a diagnostic tool, a guaranteed fertility predictor or a method of contraception. Ovulation and fertile-window dates are estimates based on recorded cycles. Cycle patterns vary. For medical concerns, consult a qualified healthcare professional.

---

## Contents

1. [Features](#features)
2. [Architecture](#architecture)
3. [Local development](#local-development)
4. [Supabase setup](#supabase-setup)
5. [Database migrations](#database-migrations)
6. [Row Level Security](#row-level-security)
7. [Environment variables](#environment-variables)
8. [Testing](#testing)
9. [Production build](#production-build)
10. [Deployment](#deployment)
11. [How the cycle estimates work](#how-the-cycle-estimates-work)

---

## Features

| Area | What it does |
| --- | --- |
| **Auth** | Sign up, sign in, sign out, email verification (with resend), forgot and reset password, persistent sessions, protected routes. Email changes and password changes in Settings re-check the current password. |
| **Dashboard** | Greeting, "Day 12 of 29", the current phase, estimated ovulation, the next period, a cycle ring, an estimated fertile window card, the last period, recent intimacy, recent symptoms, and quick actions. |
| **Calendar** | Monthly grid with period (recorded or estimated), follicular 🌱, ovulation 🥚 and luteal 🌙 tints and glyphs, a dashed outline for the fertile window, and ❤️ / 📝 markers. Selecting a day opens a details panel where you can add or edit records. It supports arrow-key navigation. |
| **Periods** | Record start and end dates (leave the end empty while ongoing). Shows duration, cycle length, and overlap and future-date validation. |
| **Intimacy** | Date and time, protection method, ejaculation, emergency contraception and notes, listed by month. Each record states whether it was *recorded during/outside the estimated fertile window* and carries a disclaimer. |
| **Symptoms & mood** | Cramps, headache, bloating, breast tenderness, fatigue, acne, back pain, nausea and other symptoms, plus six moods and notes. One log per day. |
| **Insights** | Average, shortest and longest cycle; average period length; cycle-length and period-length charts (each with a table view); symptom trends with the phase each is most common in; mood distribution; full cycle history. |
| **Settings** | Profile, cycle-length fallbacks, a privacy explanation, change email or password, sign out, and permanent account deletion (type `DELETE` to confirm). |
| **Partner sharing** | Invite one partner by email to **view** your cycle. Cycle phases and periods are always included. Symptoms & mood, intimacy records and notes are separate opt-in switches, all off by default. The partner can never edit anything, and you can change what's shared or stop sharing at any time. The invite email is sent automatically by a Supabase Edge Function. |
| **PWA** | Installable manifest and icons. The service worker caches only the static app shell and never caches API data. |

**Recorded vs. estimated.** Every value in the UI is labelled. Only period days you logged are **Recorded**. Phases, ovulation, the fertile window and future periods are marked **≈ Estimated**. Lunelle never shows a pregnancy probability and never uses wording like "safe day".

## Architecture

```
src/
  components/        Reusable UI (ui/: Button, Card, Form, Dialog, Toast, Feedback, Logo)
                     and layout (AppShell with sidebar + bottom nav, PageHeader)
  features/
    auth/            AuthProvider, authService, schemas, auth UI pieces
    cycle/           services/cycleCalculator.ts  ← the estimation engine (pure TS)
                     phases.ts, format.ts, CycleRing, PhaseBadge, PhaseGuide
    calendar/        calendarModel.ts (pure), CalendarGrid, DayDetailsPanel, legend
    dashboard/       Dashboard cards
    periods/         periodService, PeriodFormDialog
    intimacy/        intimacyService, IntimacyFormDialog, fertile-context note
    symptoms/        symptomService, SymptomFormDialog
    statistics/      insights.ts (pure), charts, history list
    settings/        settingsService, profile/cycle/account/privacy sections
    partner/         partnerService, PartnerAccessProvider, sharing settings, read-only shared view
    tracking/        TrackingDataProvider (in-memory store), RecordDialogs, form schemas
  hooks/             useToday
  lib/               supabase client, env, dates, errors, logger, grouping
  pages/             Route-level screens (pages/auth/* for sign-in flows)
  routes/            Router, guards (ProtectedRoute / PublicOnlyRoute)
  services/          Cross-feature service tests
  types/             database.ts (Supabase types), domain.ts
supabase/migrations/ SQL migrations (schema, RLS, auth functions, partner sharing)
supabase/functions/  Edge Function: send-partner-invite
tests/db/            Real-Postgres RLS tests (PGlite)
```

**Design principles**

- **Business logic is separated from the UI.** All cycle maths lives in `src/features/cycle/services/cycleCalculator.ts`. It is pure and deterministic ("today" is always passed in) and heavily tested. Components only render its output.
- **Calendar dates, not instants.** Cycle maths uses `yyyy-MM-dd` strings with calendar-day arithmetic (date-fns), so timezones and daylight-saving changes can't shift a cycle day.
- **One in-memory store per signed-in user.** A personal log is small, so `TrackingDataProvider` loads it once and keeps every screen instant without a caching library. It is keyed by user id and dropped on sign-out. Nothing is written to `localStorage` except Supabase's own session token.
- **Design tokens.** All colours (including phase colours and dark mode) are CSS variables in `src/index.css`, exposed as Tailwind utilities (`bg-surface`, `text-ink-muted`, `bg-phase-luteal-soft`, …). Components never hard-code colours.
- **Accessibility.** Phases always use an emoji or glyph plus text as well as colour. Calendar days have full spoken labels. Dialogs use the native `<dialog>` element (focus trap, Esc). Forms wire up labels, hints and errors with ARIA. The app respects `prefers-reduced-motion`, and text tokens meet WCAG AA contrast.

## Local development

Requirements: **Node.js 20+** (22 recommended) and a Supabase project (the free tier is fine).

```bash
npm install
cp .env.example .env          # then fill in your project URL + anon key
npm run dev                   # http://localhost:5173
```

If the env vars are missing, the app shows a "not configured" screen instead of failing.

## Supabase setup

1. Create a project at [supabase.com](https://supabase.com).
2. **Apply the migrations** (see below).
3. **Authentication → URL Configuration**
   - *Site URL*: `http://localhost:5173` for development, or your production URL.
   - *Redirect URLs*: add both of these for every environment:
     - `http://localhost:5173/auth/callback` and `http://localhost:5173/reset-password`
     - `https://YOUR-DOMAIN/auth/callback` and `https://YOUR-DOMAIN/reset-password`
4. **Authentication → Providers → Email**: keep *Confirm email* on. Turning on *Secure email change* is recommended.
5. **Authentication → Policies / Passwords**: set the minimum password length to 8 or more (the UI also enforces 8). Enabling leaked-password protection is recommended.
6. **Project Settings → API**: copy the **Project URL** and the **anon public** key into `.env`.
   **Never** use the `service_role` key in this app. It bypasses RLS.

Email links use the **PKCE** flow, so verification and reset links must be opened in the same browser that requested them.

## Database migrations

| File | Contents |
| --- | --- |
| `20261004000100_initial_schema.sql` | `profiles`, `periods`, `intercourse_records`, `symptoms` and `cycle_settings` tables. Includes CHECK constraints (allowed protection/ejaculation/mood/symptom values, date ordering, ranges), indexes on `user_id` and date columns, `updated_at` triggers, a period-overlap guard, and a trigger that mirrors cycle settings onto the profile. |
| `20261004000200_row_level_security.sql` | Enables RLS, revokes all privileges from `anon`, and adds per-operation owner policies for `authenticated`. |
| `20261004000300_auth_functions.sql` | `handle_new_user()` (creates the profile and default settings on sign-up) and `delete_own_account()` (permanently deletes the caller's account and data). |
| `20261005000100_partner_sharing.sql` | The `partner_shares` table (the owner can only read it; every change goes through functions), the invite, accept, decline and revoke functions, and `get_partner_shared_data()`, which is the only way a partner can read shared data. Also updates `delete_own_account()` to remove shares. |

**Option A: Supabase CLI (recommended)**

```bash
npx supabase init            # once; keeps the existing supabase/migrations folder
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push
```

**Option B: SQL editor.** Paste and run the four files in order.

After changing the schema, regenerate types:
`npx supabase gen types typescript --project-id YOUR_PROJECT_REF > src/types/database.ts`

## Row Level Security

Security is enforced **in the database**, not by frontend filtering:

- RLS is **enabled on every table**.
- Every policy uses the ownership rule `auth.uid() = user_id` (`auth.uid() = id` for `profiles`). There are separate `SELECT`, `INSERT`, `UPDATE` (with both `USING` and `WITH CHECK`, so a row can't be handed to someone else) and `DELETE` policies, all scoped `TO authenticated`.
- The **`anon` role has no table privileges at all**, so unauthenticated requests are rejected before RLS is even consulted.
- `delete_own_account()` is `SECURITY DEFINER` with a pinned `search_path` and can only delete the row whose id equals `auth.uid()`. Only `authenticated` can execute it. This is how the app deletes accounts without ever holding the service-role key.
- The overlap-check and settings-sync triggers run as the invoking user, so RLS applies to them too.

`tests/db/rls.test.ts` proves this by running the **real migration files** in PGlite (Postgres compiled to WebAssembly). It recreates Supabase's `anon` and `authenticated` roles, Supabase's permissive default grants and `auth.uid()`, then checks that one user cannot read, update, delete or insert another user's rows and that anonymous requests are denied. The suite fails if the RLS migration is removed.

**Partner sharing** keeps all of the rules above. Partners get **no** access to the tracking tables. They read shared data only through `get_partner_shared_data()`, a `SECURITY DEFINER` function that:

- checks for an **accepted** share addressed to the caller;
- returns only the categories the owner enabled;
- strips notes unless the owner allowed them.

Invitations are matched to the partner's **confirmed** email. Only the owner can create, change or revoke a share, and revoking cuts access immediately. `tests/db/partnerSharing.test.ts` covers all of this.

**Other privacy measures**

- No analytics or third-party scripts. Fonts are self-hosted, so no Google Fonts requests are made.
- No sensitive data in URLs: dates and records live in component state, and the sign-up email is passed via router state.
- No sensitive data in logs. ESLint forbids `console` everywhere except `src/lib/logger.ts`, which logs only a static label and an error code, and only in development.
- `Referrer-Policy: no-referrer`, a strict CSP, `X-Frame-Options: DENY` and `no-store` on `index.html` (see `vercel.json` and `netlify.toml`).

## Environment variables

| Variable | Description |
| --- | --- |
| `VITE_SUPABASE_URL` | Your Supabase project URL, e.g. `https://abcd1234.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | The project's **anon public** key |

`.env` is git-ignored. Only `.env.example` is committed. `VITE_*` variables are embedded into the client bundle at build time, which is why only the public anon key may ever be used.

## Testing

```bash
npm test             # all tests (unit, component, service, RLS)
npm run test:db      # only the PGlite database / RLS suite
npm run test:watch
npm run typecheck
npm run lint
```

| Suite | Covers |
| --- | --- |
| `cycleCalculator.test.ts` | 21, 28, 29, 30 and 35-day cycles. Day 1, period end, ovulation day, fertile window edges, luteal phase, next period. Prediction from history vs. settings, outlier gaps, statistics. Month and year boundaries, leap years (29 Feb), late, ongoing and missing-end periods, future periods ignored. |
| `auth.test.tsx` | Protected-route redirects, return-to-page after sign-in, sign-out lockout, login validation and errors, unverified email, sign-up validation and verification flow (email kept out of the URL), forgot and reset password. |
| `dataServices.test.ts` | CRUD for periods, intimacy, symptoms, profile and settings: correct tables, writes scoped to `user_id`, mapping, error propagation. |
| `schemas.test.ts`, `calendarModel.test.ts`, `insights.test.ts` | Form validation, calendar grids (leap years, week start), spoken day labels, symptom and mood trends. |
| `appSmoke.test.tsx` | Mounts the real route tree for a signed-in user with seeded data and renders every screen. |
| `tests/db/partnerSharing.test.ts` | Invite rules (no self-invite, one active share, daily limit), verified-email matching, accept, decline and revoke, category and notes filtering, no direct table access for partners, owner-only scope changes, resend cooldown. |
| `tests/edge/inviteEmail.test.ts` | Invite email content: no health data, HTML escaping of names, a header-safe subject line. |
| `tests/db/rls.test.ts` | RLS and grants on every table, owner CRUD, cross-user isolation, anonymous denial, constraints, sign-up trigger, account deletion. |

## Production build

```bash
npm run build      # type-checks, then builds to dist/
npm run preview    # serve the production build locally
```

`node scripts/generate-icons.mjs` regenerates the PWA PNG icons from the logo geometry (no dependencies).

## Deployment

Supabase provides authentication, PostgreSQL and database security. The frontend is a static SPA that can be hosted on Vercel, Netlify or GitHub Pages.

**Vercel.** Import the repository; `vercel.json` already sets the build command, the SPA rewrite and the security headers. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` under *Project → Settings → Environment Variables*, then redeploy.

**Netlify.** Import the repository; `netlify.toml` sets the build, the `/* → /index.html 200` rewrite and the headers. Add the same two variables under *Site configuration → Environment variables*.

**GitHub Pages.** `.github/workflows/deploy-pages.yml` lints, typechecks, runs every test (including the RLS suite), builds, and deploys on each push to `main`.

1. **Settings → Pages → Build and deployment → Source:** choose **GitHub Actions**.
2. **Settings → Secrets and variables → Actions → Variables:** add `VITE_SUPABASE_URL` (e.g. `https://abcd1234.supabase.co`) and `VITE_SUPABASE_ANON_KEY` (the publishable or anon key). These are public values. Never add the secret or service-role key.
3. Push to `main`, or run the workflow from the **Actions** tab. The site is published at `https://<user>.github.io/<repo>/`.

How it works on Pages:
- The build sets `BASE_PATH=/<repo>/`. Vite, React Router, the manifest, the service worker and the email redirect links all honour it.
- `404.html` is a copy of `index.html`, so deep links, refreshes and auth redirects load the app.
- Pages can't send custom headers, so the Content-Security-Policy is added as a `<meta>` tag at build time. `X-Frame-Options` and `frame-ancestors` can't be set on Pages; use Vercel or Netlify if you need anti-framing headers.

**After deploying:**

- Add `https://YOUR-DOMAIN/auth/callback` and `https://YOUR-DOMAIN/reset-password` to Supabase *Redirect URLs*, and set the *Site URL*.
- If you use a **custom Supabase domain**, add it to `connect-src` in the CSP in both config files.
- Client-side routes (`/calendar`, `/insights`, …) work on refresh because of the SPA rewrite.

## Partner invite emails (Edge Function)

Invitations are emailed by `supabase/functions/send-partner-invite`. The function runs with the signed-in owner's own token and the public key, so RLS and the owner checks still apply; it never uses the service-role key. Emails are sent through [Resend](https://resend.com), which has a free tier.

1. **Set up Resend.** Create an account and an API key. To email any address you must [verify a sending domain](https://resend.com/domains). Until then, Resend's test sender (`onboarding@resend.dev`) can only email *your own* Resend account address, which is enough for testing.
2. **Link the project** (once):
   ```bash
   npx supabase init            # keeps the existing supabase/ folder
   npx supabase login
   npx supabase link --project-ref YOUR_PROJECT_REF
   ```
3. **Set the function's secrets:**
   ```bash
   npx supabase secrets set RESEND_API_KEY=re_xxx
   npx supabase secrets set "INVITE_FROM_EMAIL=Lunelle <invites@your-domain.com>"
   npx supabase secrets set APP_URL=https://your-app.example.com
   npx supabase secrets set ALLOWED_ORIGINS=http://localhost:5173,http://localhost:5174
   ```
   `APP_URL` is used for the link in the email and is allowed as a browser origin. Add your dev origins to `ALLOWED_ORIGINS`.
4. **Deploy:** `npx supabase functions deploy send-partner-invite`. Leave JWT verification on (the default).

If the email can't be sent, the invitation is still created. The owner sees the error and can press **Resend email** in Settings. Resends are limited to one per minute, and new invitations to five per day.

**How the partner accepts:** they open the link, then sign in or create an account **with the invited email address**, verify it, and accept under **Shared with you**. That page is also reachable from the dashboard banner and the "Shared" nav item.

## How the cycle estimates work

- **Cycle day 1** is the first day of a period. **Cycle length** is the number of days from one period start to the next.
- **Prediction basis:** the mean of your most recent recorded cycles (up to 6), rounded to whole days. Gaps outside 15–60 days are treated as missing records. If no cycle has been completed yet, your Settings values are used. Lunelle never silently assumes 28 days.
- **Estimated ovulation** ≈ expected next period − 14 days.
- **Estimated fertile window** runs from 5 days before to 1 day after estimated ovulation.
- **Phases:** menstruation (recorded or estimated period days), then follicular, then ovulation (estimated ovulation ± 1 day), then luteal.
- **Past cycles** get a retrospective estimate from the actual next period start. **Future cycles** are projected about 12 cycles ahead. If a period is **late**, Lunelle says so and stops projecting rather than stacking guesses.

*Fertility dates are estimates. Cycle tracking cannot guarantee pregnancy prevention.*
