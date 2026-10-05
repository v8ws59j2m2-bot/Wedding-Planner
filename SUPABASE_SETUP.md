# Supabase setup — Jamie & Beth wedding planner

This is the technical record for the planner’s Supabase project, plus the steps to turn cloud mode on locally.

---

## This project

| | |
|---|---|
| **Supabase project ref** | `gezexfnzemsqhrvizetj` |
| **Project URL** | `https://gezexfnzemsqhrvizetj.supabase.co` |
| **URL env var** | `VITE_SUPABASE_URL` |
| **Key env var** | `VITE_SUPABASE_ANON_KEY` (anon / publishable key) |
| **Live site** | [baliplanner.netlify.app](https://baliplanner.netlify.app) |
| **Netlify project** | `baliplanner` (site id `160d0deb-0df9-4b61-b950-2ff8e3702ad1`) |
| **Netlify team** | Wedding Planner |
| **GitHub account** | [`v8ws59j2m2-bot`](https://github.com/v8ws59j2m2-bot) (owns this repo) |

The publishable key is already stored in two places: the local `.env` file, and the Netlify environment variables for `baliplanner` (saved 16 June 2026). It is not copied into this document. Use the **anon / publishable** key only. Never use the **service_role** key in the app.

Netlify has **no Supabase extension**. The only connection is those two environment variables. Changing them does nothing until a new production deploy runs, because Vite bakes them into the JavaScript at build time.

The published app does **not** read `VITE_DATA_SOURCE`. After a person signs in, planner data is stored in this Supabase project. Each app login has its own rows. Guest stay payments are part of that data: they are saved inside `app_data.guests`, not in the browser and not in a separate table.

## How to open the Supabase dashboard

Supabase has no password of its own. The project is opened with **Sign in with GitHub**.

GitHub itself has no separate password either. That account uses **Sign in with Apple**, and Apple hides the real address behind a Hide My Email relay. The relay address is not stored in this repo.

Do it in this order:

1. Sign in to [github.com](https://github.com) as `v8ws59j2m2-bot`, using **Sign in with Apple**.
2. Open [supabase.com/dashboard](https://supabase.com/dashboard).
3. Choose **Sign in with GitHub**. Approve the GitHub prompt if it appears.
4. Open project `gezexfnzemsqhrvizetj`.

Signing in to Supabase with an email and password will not work. The GitHub session has to exist first, because that is the only login Supabase recognises.

**If the project is paused**

Free Supabase projects pause after a stretch without use. The hostname then stops resolving. Open the dashboard, open this project, choose **Restore**, and wait a minute or two before trying the app again.

---

## Local `.env` for `npm run dev`

The folder on this computer already has a `.env`. Follow these steps only on a new machine, or if that file was lost. The published site does not use this file. Netlify has its own copies of the URL and the anon key.

---

## Step 1 — Get the Supabase URL and key

1. Open the dashboard using **How to open the Supabase dashboard** above (GitHub first, then **Sign in with GitHub**).
2. Open project **`gezexfnzemsqhrvizetj`** (if it was paused, click **Restore** first and wait a minute).
3. Click the **gear icon** → **Project Settings**.
4. Click **API** in the left menu.
5. Copy these two things:

| What you see in Supabase | What we call it in the app |
|--------------------------|----------------------------|
| **Project URL** | `VITE_SUPABASE_URL` |
| **anon** or **publishable** key (public) | `VITE_SUPABASE_ANON_KEY` |

The project URL is `https://gezexfnzemsqhrvizetj.supabase.co`.

**Important:** Use the **anon / public / publishable** key.  
Do **not** use the **service_role** key (that one is secret and must stay private).

---

## Step 2 — Open the `.env` file

1. Open the **Wedding-Planner** folder on your computer  
   (the same folder that has `package.json`).  
2. Open the file named exactly:

```text
.env
```

If that file is missing, create it from the example:

```bash
cp .env.example .env
```

Tips:

- The name starts with a **dot**.  
- Do not make a second file if `.env` is already there.

---

## Step 3 — Paste this into `.env` (copy all of it)

```env
VITE_SUPABASE_URL=https://gezexfnzemsqhrvizetj.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

Then:

1. The URL above is this project’s **Project URL**. Leave it as written.
2. Replace `your-anon-key` with the **anon / publishable** key from Project Settings → API, or copy it from the existing Netlify variable `VITE_SUPABASE_ANON_KEY`.
3. **Save** the file.

Do not add `VITE_DATA_SOURCE` for normal work. The published code ignores it. An uncommitted experiment on this computer reads it. That experiment is described in `docs/MAINTENANCE.md` and is not what the live site runs.

---

## Step 4 — Restart the app (required)

The app only reads `.env` when it **starts**.

1. Stop the running app (in Terminal: press `Ctrl+C`).  
2. Start it again:

```bash
npm run dev
```

3. Open the app in the browser.  
4. Sign in with the planner email and password.

---

## Quick checklist

- [ ] Supabase project `gezexfnzemsqhrvizetj` is open / not paused
- [ ] `.env` exists in the Wedding-Planner folder
- [ ] URL is `https://gezexfnzemsqhrvizetj.supabase.co` and the key is the real anon / publishable key
- [ ] Saved the file
- [ ] Restarted with `npm run dev`
- [ ] Signed in

---

## If something goes wrong

| What you see | What to try |
|--------------|-------------|
| Sign-in fails and the browser cannot reach `gezexfnzemsqhrvizetj.supabase.co` | The project may be paused. The published sign-in screen shows the request error. It does not have its own “project paused” message. Restore the project in the dashboard and wait 1–2 minutes. |
| Blank or crashed local app on startup | `.env` is missing the URL or the key, or the dev server was not restarted after editing `.env` |
| Login fails | Confirm the URL and the **anon / publishable** key, not the service_role key. App login is email and password. Dashboard login is GitHub. |

More detail is in `.env.example` and `docs/MAINTENANCE.md`.
