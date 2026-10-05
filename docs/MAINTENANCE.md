# Maintenance — Jamie & Beth wedding planner

Operating notes for the published site. If a sentence here disagrees with an uncommitted file on this computer, trust GitHub `main`. That is what Netlify builds.

## Two sites, do not mix them up

| | Wedding planner | Guest information site |
|---|---|---|
| Folder | `/Users/jamiedepport/Wedding-Planner` | `/Users/jamiedepport/Wedding-Guest-Site` |
| GitHub | `v8ws59j2m2-bot/Wedding-Planner` | `v8ws59j2m2-bot/Wedding-Guest-Site` |
| Netlify project | `baliplanner` | `jamiebeth` |
| Site id | `160d0deb-0df9-4b61-b950-2ff8e3702ad1` | `9638cddb-e4ac-47c1-bcd5-c8429d2e06e7` |
| URL | https://baliplanner.netlify.app | https://jamiebeth.netlify.app |

A push in the planner folder must not be deployed to `jamiebeth`.

## What is live

| | |
|---|---|
| URL | https://baliplanner.netlify.app |
| Netlify team | Wedding Planner (account slug `bethanyieverson2`) |
| Netlify login seen on this Mac | Beth Everson, `bethanyieverson2@gmail.com` |
| GitHub repo | https://github.com/v8ws59j2m2-bot/Wedding-Planner |
| Branch Netlify builds | `main` |
| Build | `npm run build` (`tsc -b && vite build`) |
| Publish directory | `dist` |
| Node on Netlify | 20 (`netlify.toml` and the `NODE_VERSION` env var) |
| Node on this Mac | 22, last checked 5 October 2026. Netlify does not use it. |
| Supabase project ref | `gezexfnzemsqhrvizetj` |
| Supabase URL | `https://gezexfnzemsqhrvizetj.supabase.co` |

Config that matters: `netlify.toml`, `package.json`, `supabase-setup.sql`, `src/lib/supabase.ts`, `src/lib/supabaseData.ts`, `src/hooks/useSupabaseStorage.ts`, `src/main.tsx`.

## Deploy

Production deploys only from GitHub.

1. Commit on `main`.
2. `git push origin main`.
3. Netlify starts a production build. The build command is `npm run build` and the published folder is `dist`.
4. When the deploy is `ready`, https://baliplanner.netlify.app serves the new assets. Asset filenames are hashed, so a changed bundle gets a new name in `index.html`.

There is no separate Netlify drag-and-drop step. `netlify deploy` from a dirty working tree would publish files that are not on `main`. Do not do that for a normal release.

Vite bakes `VITE_*` variables into the JavaScript at build time. Changing a Netlify env var does nothing until the next successful build.

## Environment variables

| Name | Where it is set | Notes |
|---|---|---|
| `VITE_SUPABASE_URL` | Local `.env`, Netlify | `https://gezexfnzemsqhrvizetj.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Local `.env`, Netlify | Anon / publishable key. Saved on Netlify on 16 June 2026. Not written in these docs. |
| `NODE_VERSION` | Netlify | `20` |

Netlify has no Supabase extension. The link is those variables only.

Do not commit `.env`. Do not put the service_role key in the app, in Netlify, or in git. `.netlify/` is gitignored local CLI state.

## Two different logins

**Supabase dashboard** (restore a paused project, copy the API key, open the SQL editor):

1. Sign in to GitHub as `v8ws59j2m2-bot` with **Sign in with Apple**. GitHub has no separate password. The Apple Hide My Email relay address is not stored in this repo.
2. Open https://supabase.com/dashboard and choose **Sign in with GitHub**.
3. Open project `gezexfnzemsqhrvizetj`.

An email-and-password form on the Supabase dashboard will not open this project. The GitHub session has to exist first.

**App login** (the wedding planner screen):

- Email and password of a user created in this Supabase project's Auth.
- Auth providers confirmed on 5 October 2026: email is on. GitHub, Google, and Apple are off for app users.
- That is separate from the dashboard login. The GitHub account does not sign you into the planner.

One app user owns one set of rows (`auth.uid()`). Jamie and Beth only share a planner if they use the same app login.

## Paused database

Free Supabase projects pause after a stretch without use. The hostname `gezexfnzemsqhrvizetj.supabase.co` then stops resolving. The site HTML still loads. Sign-in cannot reach Auth. The published sign-in screen shows the error from that failed request. It does not have a separate “project paused” banner. That banner exists only in uncommitted local edits to `AuthScreen.tsx`.

1. Open the dashboard with the GitHub path above.
2. Open project `gezexfnzemsqhrvizetj` and choose **Restore**.
3. Wait a minute or two.
4. Check `https://gezexfnzemsqhrvizetj.supabase.co/auth/v1/health` returns HTTP 200, then try the planner sign-in again.

The project was paused and then restored on 5 October 2026. Health at that point was HTTP 200.

## Backups

The top-bar **Export** downloads the planner currently in memory plus wedding details. On `main` the filename looks like `wedding-backup-YYYY-MM-DD.json`. Settings has its own download named `jamie-beth-wedding-backup-YYYY-MM-DD.json`.

Import offers merge or replace. Replace overwrites the signed-in user's cloud rows on the next save.

Export after a real planning session. A paused project blocks sign-in, so a JSON file is the copy you can still open.

## Beth page-change note

`src/components/LoveNote.tsx` has `LOVE_NOTES_ENABLED`. It is `false`. Production commit `efab527` (5 October 2026) removed the popup. To turn it back on, set the constant to `true`, commit, and push `main`.

## Local commands

From `/Users/jamiedepport/Wedding-Planner`:

```bash
npm install
npm run dev
npm run build
npm run lint
npm run preview
```

`npm run dev` needs `.env` as described in `SUPABASE_SETUP.md`. Restart the dev server after any `.env` edit.

`scripts/e2e-moodboard.mjs` is an old mood-board script. Do not treat any test email in `.env` as a real planner login.

## Schema changes

- `supabase-setup.sql` is the schema script: tables, RLS, realtime publication, and a `moodboard` storage bucket.
- The five tables answered on 5 October 2026 (`app_data`, `wedding_details`, `seating_data`, `accommodation_data`, `moodboard_data`). An anonymous read returns an empty list because RLS hides other people's rows. That does not mean the tables are empty.
- The `moodboard` storage bucket was not there on that same check. `GET /storage/v1/bucket/moodboard` returned `Bucket not found`, and listing buckets returned none. `uploadMoodImage` in `src/lib/supabaseData.ts` still expects that bucket. Creating it would be a change to the live project, so it was left alone.
- `supabase-migrations/20260619-moodboard-rls-update-check.sql` is a one-off fix so `moodboard_data` updates include a `WITH CHECK` clause. Whether that statement has already been applied is not recorded in the repo.

Run SQL in the Supabase SQL editor for project `gezexfnzemsqhrvizetj`. Do not re-run the whole setup script blindly on a database that already has data. Policies that already exist will error. The file says which statements are safe to repeat.

## Uncommitted work on this computer

`git status` may show files that are not on `main`. As of 5 October 2026 that included a data-source switch that production does not have:

- `src/lib/dataSource.ts`
- `src/lib/localData.ts`
- `src/components/DevDataSourcePanel.tsx`
- rewritten `src/services/dataService.ts`, `src/main.tsx`, and several hooks

That experiment reads `VITE_DATA_SOURCE`. The published app ignores that variable and always uses Supabase after sign-in. Before changing live behaviour, run `git diff HEAD` and `git show HEAD:<file>`. Do not deploy the working tree with `netlify deploy`.

`CODE_REVIEW.md` is a point-in-time review. Findings in it can be out of date. It is not this runbook.
