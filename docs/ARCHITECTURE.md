# Architecture — Jamie & Beth wedding planner

This describes GitHub `main`, which is what Netlify builds for https://baliplanner.netlify.app. If the working tree disagrees, `git diff HEAD` wins over this file only after that diff is pushed. Until then, this file describes production.

## Stack

- React 19, TypeScript, Vite 8
- Tailwind 4 via `@tailwindcss/vite`
- Supabase JS (`@supabase/supabase-js`) for Auth, Postgres, Realtime, and Storage
- Drag and drop: `@hello-pangea/dnd` and `@dnd-kit/*`
- Charts: Recharts
- Spreadsheets: `xlsx`
- Mood-board PDF: `jspdf` and `html2canvas` (pulled in by the PDF helper)

There is no server of our own. Netlify serves the static `dist` folder. `netlify.toml` sends every path to `index.html` (status 200) because navigation is client-side. The app does not use URL routes. The current screen is React state of type `Page` in `src/types.ts`.

## Boot

`src/main.tsx` on `main`:

1. Read any existing Supabase session from `localStorage` key `sb-gezexfnzemsqhrvizetj-auth-token`.
2. If there is no session, render `AuthScreen`. Email and password only.
3. If there is a session and `localStorage` still has `jamie-beth-wedding-planner` and not `jb-supabase-migrated`, render `MigratePage` once to copy that browser blob into Supabase.
4. Otherwise render `App` inside the currency and mood-board providers.

The published `main.tsx` does not have an offline bypass. If Supabase cannot be reached, the person stays on the sign-in screen.

The uncommitted `main.tsx` on this computer adds a 2.5 second auth timeout and a "continue offline" path. That is not production.

## Screens

Sidebar ids in `src/components/Sidebar.tsx`, rendered from `src/App.tsx`:

| Id | Label | What it mounts |
|---|---|---|
| `dashboard` | Dashboard | `pages/Dashboard.tsx` |
| `guests` | Guests | `pages/GuestsPage.tsx` — Guest List, Travel & Logistics |
| `budget-payments` | Budget & Payments | `pages/BudgetPaymentsPage.tsx` — Budget, Upcoming Payments, Financial Overview |
| `vendors` | Vendors | `pages/Vendors.tsx` |
| `accommodation` | Accommodation | `pages/Accommodation.tsx` |
| `seating` | Seating | `pages/SeatingChart.tsx` |
| `planning` | Planning | `pages/PlanningPage.tsx` — Events, Itinerary, Checklist, Mood Board |
| `settings` | Settings | `pages/Settings.tsx` |

Older docs that list Guest List, Budget, Checklist, Mood Board, Finances, Events, and Itinerary as separate sidebar items are out of date. Those screens are tabs inside the rows above.

## Where data is stored

After sign-in, the live store is Supabase. Row Level Security keeps every row on `auth.uid()`.

| Concern | Table or bucket | Code that talks to it |
|---|---|---|
| Guests, budget, checklist, vendors, events, travel, legacy mood images | `app_data` (one JSON row per user) | `useSupabaseStorage` → `supabaseData` |
| Wedding details | `wedding_details` | `supabaseData`, Settings |
| Seating tables | `seating_data` | `pages/SeatingChart.tsx` |
| Rooms | `accommodation_data` | `pages/Accommodation.tsx` |
| Mood board images and swatches | `moodboard_data` | `hooks/useMoodBoard.ts` |
| Mood board files | Storage bucket `moodboard` is what `uploadMoodImage` expects. It was not present on the live project on 5 October 2026 (`Bucket not found`, and the bucket list was empty). | `src/lib/supabaseData.ts` |
| Day-of timeline | column `app_data.timeline`, also read through timeline helpers | Checklist |

`app_data` is the original localStorage shape, stored as JSONB. There is not a separate SQL table per guest.

`supabase-setup.sql` adds `app_data`, `seating_data`, `accommodation_data`, and `moodboard_data` to the realtime publication. This review did not re-check that publication on the live database. The published `useSupabaseStorage` debounces saves (echo ignore about 1.2 seconds), subscribes for remote changes, and runs a health check about every 20 seconds.

`supabase-setup.sql` describes that bucket as public-read, 10 MB per file, jpeg / png / webp / gif, with writes limited to a folder named with the user id. That is the intended setup. It is not what the live project returned on 5 October 2026. Mood-board rows in `moodboard_data` are separate and that table did respond.

### Browser keys that still matter

| Key | Role on the published app |
|---|---|
| `sb-gezexfnzemsqhrvizetj-auth-token` | Supabase session |
| `jamie-beth-wedding-planner` | Old browser copy. Presence of this key, without `jb-supabase-migrated`, opens the one-time migrate screen. |
| `jb-supabase-migrated` | Set when migrate is finished, so it does not run again |
| `jb-wedding-details`, `jb-seating`, `jb-accommodation`, `jb-moodboard`, `jb-timeline` | Older browser copies. Cloud tables are the live source after sign-in. |
| `jb-exchange-rates` | GBP→IDR rate cache, 12 hours |
| `jb-currency-prefs` | Display currency choice |

Currency rates come from `https://api.frankfurter.dev/v1/latest?from=GBP&to=IDR`. Amounts are stored in GBP. If the API and the cache both fail, the fallback rate is 20500 IDR per GBP. That fallback is approximate.

## Supabase client

`src/lib/supabase.ts` creates one client from `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. On `main`, a missing value throws at startup. Session persistence and auto-refresh are on. Realtime heartbeats are 15 seconds, with a 25 second timeout. A disconnected heartbeat notifies registered reconnect handlers.

Auth settings confirmed 5 October 2026: email sign-up is enabled, mailer autoconfirm is off, so a new account must confirm email. Social providers for the app are off.

## Security headers

`netlify.toml` sets, for all responses:

- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy` with camera, microphone, and geolocation disabled
- `Strict-Transport-Security` for one year, including subdomains

Hashed files under `/assets/*` are cached for one year, immutable.

## Page-change note

`LoveNoteProvider` wraps the signed-in app. `LOVE_NOTES_ENABLED` in `src/components/LoveNote.tsx` is `false`, so navigation does not show the "For Beth" overlay. The copy strings live in `src/data/loveNotes.ts` and stay unused while the flag is off.

## What production does not include

Do not document these as live behaviour unless they have been committed and pushed:

- `VITE_DATA_SOURCE`
- `src/lib/dataSource.ts` and `src/lib/localData.ts`
- `DevDataSourcePanel` (the dev-only Data chip)
- An offline "continue in this browser" button on the sign-in screen

Those exist only as uncommitted work. `docs/MAINTENANCE.md` lists them.
