# Jamie & Beth — Wedding Planner

## Application Overview

A personal, all-in-one wedding planning app built for Jamie and Beth's destination wedding in Canggu, Bali, April 2028. It helps manage every aspect of a destination wedding in one place — from guest lists and vendor tracking to room allocation, event scheduling, budget oversight, seating, accommodation, and a printable guest itinerary.

The app is currently in a **transitional state** between local-first and cloud-synced operation.

---

## Current Status

- **Primary mode (current):** The app runs as a fast, private, local-first application using browser `localStorage`.
- **Supabase backend:** A complete Supabase implementation has already been developed, including realtime subscriptions, user authentication, mood board support via Supabase Storage, and dedicated tables for guests, budget, vendors, seating, accommodation, timeline, and wedding details.
- **Migration status:** Migration tooling (`MigratePage`) and authentication (`AuthScreen`) exist. The switch from the local data service to the Supabase layer is in active progress but is not yet complete or enabled by default.

Once the migration is finalised, the app will support real-time collaboration between Jamie and Beth, automatic cross-device syncing, and easier integration with the Wedding Guest Site.

---

## Who It's For

The app is designed for Jamie and Beth to use together during their planning journey. It is being actively developed toward full Supabase-backed real-time collaboration while keeping the current smooth local experience as the foundation.

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

## Current Architecture & Migration Status

The app currently has **two parallel data layers**:

- **`src/services/dataService.ts`** — The active localStorage implementation used by the UI today.
- **`src/lib/supabaseData.ts`** — A complete Supabase implementation (with realtime, auth, and dedicated tables) that has been built and is ready to become the primary data layer.

Authentication and migration tooling already exist. The UI was designed so that switching the data service requires minimal changes to the pages themselves.

**Current state:** Local mode is the default experience. Supabase mode is available for testing/migration but is not yet the primary path for all users.

---

## Known Limitations (Current Version)

- **Migration in progress** — The app is transitioning from local-only to Supabase-backed. Full real-time multi-device sync and collaboration is not yet the default experience.
- **Single device (local mode)** — While using localStorage, data does not sync between devices automatically.
- **Browser-bound (local mode)** — Clearing browser data or using private/incognito mode will lose local data.
- **Authentication required for Supabase mode** — Once fully migrated, signing in will be required to access data across devices.
- **Mood Board performance** — Large numbers of high-resolution images can still impact performance on some devices.

---

## Tech Stack

- **React 19** + **TypeScript**
- **Vite**
- **Supabase** (Postgres + Realtime + Storage) — backend in active migration
- **@hello-pangea/dnd** — drag and drop
- **Recharts** — charts
- **xlsx (SheetJS)** — Excel template generation

---

## Getting Started

Open the app in your browser. All data is stored locally by default. Use the **Export** button regularly to back up your data as a JSON file.

For the latest on the Supabase migration and multi-device support, check the **Current Architecture & Migration Status** section above.

---

*Built with care for Jamie & Beth · Canggu, Bali · April 2028*