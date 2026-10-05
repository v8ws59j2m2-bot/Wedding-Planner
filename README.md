# Jamie & Beth — Wedding Planner

## Application Overview

A personal, all-in-one wedding planning app built for Jamie and Beth's destination wedding in Canggu, Bali, April 2028. It helps manage every aspect of a destination wedding in one place — from guest lists and vendor tracking to room allocation, event scheduling, budget oversight, seating, accommodation, and a printable guest itinerary.

The published site stores each signed-in person's planner in Supabase. Two different logins do not share one dataset.

---

## Documentation

| Doc | Who it is for |
|---|---|
| `QUICK_START.md` | Using the planner day to day |
| `SUPABASE_SETUP.md` | Project id, dashboard sign-in, local `.env` |
| `docs/MAINTENANCE.md` | Deploy, recovery, env vars, what not to mix up |
| `docs/ARCHITECTURE.md` | How the published app is built and where data lives |

`CODE_REVIEW.md` is an old review snapshot. It is not the operating guide.

---

## Current Status

- **Live site:** [baliplanner.netlify.app](https://baliplanner.netlify.app). Netlify project `baliplanner` builds `main` from [github.com/v8ws59j2m2-bot/Wedding-Planner](https://github.com/v8ws59j2m2-bot/Wedding-Planner).
- **Sign-in:** The app asks for an email and password before the dashboard. That is a user inside the Supabase project, not the Supabase dashboard login.
- **Data:** After sign-in, guests, budget, vendors, events, seating, accommodation, wedding details, and the mood board are stored in Supabase project `gezexfnzemsqhrvizetj`.
- **Dashboard access:** Sign in to GitHub as `v8ws59j2m2-bot` with Apple, then choose **Sign in with GitHub** on Supabase. There is no separate Supabase password. See `SUPABASE_SETUP.md`.
- **Beth notes:** The page-change note is off (`LOVE_NOTES_ENABLED` in `src/components/LoveNote.tsx`). That is what production is running.

---

## Who It's For

The app is for Jamie and Beth's planning. Each Supabase login has its own private rows. Sharing one planner means using the same app login.

---

## Key Features

### Dashboard
A real-time overview of your wedding planning progress. Shows a live countdown to the wedding date, headline stats (guest count, budget progress, tasks completed, vendors booked), and an attention panel that surfaces anything that needs your focus.

### Guest Management
Add and manage your confirmed guest list. Guests can be grouped by party or family name, categorised as adults or children, and given meal preferences, email addresses, and notes. Export your guest list as CSV or JSON, or import from a spreadsheet template.

### Budget & Expenses
Track all your confirmed (Booked) and provisional (Quoted) expenses. Each expense is linked to a vendor, categorised, and supports multiple payments over time. Quoted expenses are kept visible but excluded from budget totals until confirmed. A pie chart breaks down spend by category.

### Vendors
A directory of all your suppliers — photographers, caterers, florists, and more. Each vendor has contact details, category, and status (Quoted or Booked).

### Financial Overview
A consolidated financial picture combining all booked budget items and vendor payments. Shows total budget vs total paid, outstanding balances, category breakdown charts, and smart insights.

### Checklist
A prioritised task list organised by planning phase. Tasks can be marked done, given due dates, and reordered by drag and drop. Overdue tasks show a badge on the sidebar navigation.

### Mood Board
A visual inspiration board. Upload images and organise them by category alongside a colour palette tool.

### Seating Chart
Drag-and-drop guest assignment to named tables. Tables can be round or rectangular with defined capacities.

### Accommodation
Plan room allocation across your villas and guesthouses. Rooms are added with name, type, and capacity. Guests are dragged onto rooms. Supports extra bedding requests with a capacity warning system.

### Events & Activities
Plan the full trip — both wedding events and optional group activities. Wedding events track timing, location, dress code, and transport. Optional activities include cost-per-person tracking and guest sign-up/payment tracking.

### Guest Itinerary
Build and export a printable guest welcome book from your events and activities. Choose which events to include, add a welcome note, and export directly to PDF.

### Settings & Data
Manage your wedding details, currency preferences, and data backup. Export a full JSON backup at any time. Import a previous backup to restore or merge data. Download Excel templates for bulk importing.

---

## Currency Support

The app supports GBP (£) and IDR (Rp). All amounts are stored internally in GBP. When entering an amount in IDR, the app fetches a live mid-market exchange rate and converts it automatically. You can toggle the display currency at any time.

---

## Current Architecture

The published app (GitHub `main`) loads and saves through `src/lib/supabaseData.ts`, mostly via `src/hooks/useSupabaseStorage.ts`. `src/services/dataService.ts` on `main` is still the browser-storage helper used for import parsing and the JSON download. It is not the live store.

A free Supabase project pauses when it is left unused. The hostname then stops resolving and the sign-in screen cannot reach the server until the project is restored. Steps are in `docs/MAINTENANCE.md`.

This computer also has uncommitted files that add a `VITE_DATA_SOURCE` switch. That switch is not on `main` and is not what Netlify builds. Do not describe the live site from those files. See `docs/MAINTENANCE.md`.

---

## Known Limitations (Current Version)

- **One login, one dataset** — Jamie and Beth do not see the same planner unless they sign in as the same app user.
- **Paused backend** — If the free Supabase project sleeps, the site still loads but sign-in cannot reach the database until it is restored.
- **Export is the backup** — Use **Export** in the top bar. The file is the in-memory planner plus wedding details.
- **Mood Board performance** — Large numbers of high-resolution images can still impact performance on some devices.

---

## Tech Stack

- **React 19** + **TypeScript**
- **Vite**
- **Supabase** (Postgres + Auth + Realtime + Storage) — live data store for the published site
- **@hello-pangea/dnd** — drag and drop
- **Recharts** — charts
- **xlsx (SheetJS)** — Excel template generation

---

## Getting Started

Open [baliplanner.netlify.app](https://baliplanner.netlify.app) and sign in. Use **Export** regularly. Day-to-day use is in `QUICK_START.md`. Deploys, keys, and a paused project are in `docs/MAINTENANCE.md`.

---

*Built with care for Jamie & Beth · Canggu, Bali · April 2028*