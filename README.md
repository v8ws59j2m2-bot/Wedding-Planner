# Jamie & Beth — Wedding Planner

## Application Overview

A personal, all-in-one wedding planning app built for Jamie and Beth's destination wedding in Canggu, Bali, April 2028. Designed to manage every aspect of a destination wedding in one place — from guest lists and vendor tracking to room allocation, event scheduling, and budget oversight.

---

## What This App Is

A local-first web application that runs entirely in your browser. No account required, no internet dependency for day-to-day use. All your planning data lives on your device and can be exported as a JSON backup file at any time.

It's built around the reality of a destination wedding: a large group of guests travelling to Bali, multiple accommodation villas, a mix of wedding events and optional group activities, vendors quoted in both GBP and IDR, and a need to keep a clear picture of costs across everything.

---

## Who It's For

The app is designed for the couple — Jamie and Beth — to use together during their planning journey. It assumes you're comfortable with a modern web interface and want a structured, elegant tool that keeps everything in one place rather than across a dozen spreadsheets.

---

## Key Features

### Dashboard
A real-time overview of your wedding planning progress. Shows a live countdown to the wedding date, headline stats (guest count, budget progress, tasks completed, vendors booked), and an attention panel that surfaces anything that needs your focus — overdue tasks, unallocated guests, unset budget, and more.

### Guest Management
Add and manage your confirmed guest list. Guests can be grouped by party or family name, categorised as adults or children, and given meal preferences, email addresses, and notes. Export your guest list as CSV or JSON, or import from a spreadsheet template.

### Budget & Expenses
Track all your confirmed (Booked) and provisional (Quoted) expenses. Each expense is linked to a vendor, categorised, and supports multiple payments over time — so you can record a deposit, then a final balance, and always see exactly how much is outstanding. Quoted expenses are kept visible but excluded from budget totals until confirmed. A pie chart breaks down spend by category.

### Vendors
A directory of all your suppliers — photographers, caterers, florists, and more. Each vendor has contact details, category, and status (Quoted or Booked). Cost tracking and payment recording happens on the Budget page, linked back to the vendor.

### Financial Overview
A consolidated financial picture combining all booked budget items and vendor payments. Shows total budget vs total paid, outstanding balances, a category breakdown chart, and smart insights. Quoted items appear as a pipeline notice but don't affect totals.

### Checklist
A prioritised task list organised by planning phase — 12+ months out, 6 months, 3 months, and so on. Tasks can be marked done, given due dates, and reordered by drag and drop. Overdue tasks show a badge on the sidebar navigation.

### Mood Board
A visual inspiration board. Upload images and organise them by category (Florals, Attire, Venue, etc.) alongside a colour palette tool for capturing your wedding palette.

### Seating Chart
Drag-and-drop guest assignment to named tables. Tables can be round or rectangular with defined capacities. Unallocated guests are shown in a sidebar for easy drag-over assignment.

### Accommodation
Plan room allocation across your villas and guesthouses. Rooms are added with name, type, and capacity. Guests are dragged onto rooms. Supports extra bedding requests (cots, rollaway beds, etc.) per room, with a capacity warning system that adjusts when extra beds cover an overage.

### Events & Activities
Plan the full trip — both wedding events (Welcome Dinner, Ceremony, Reception, Farewell Brunch) and optional group activities (sunset tours, cooking classes, spa days). Wedding events track timing, location, dress code, and transport. Optional activities add cost-per-person tracking and a simple guest sign-up and payment system (Attending / Paid checkboxes per guest). All events feed into the Guest Itinerary.

### Guest Itinerary
Build and export a printable guest welcome book from your events and activities. Choose which events to include, add a welcome note, and print directly to PDF from your browser. The itinerary shows a single chronological schedule across all days.

### Settings & Data
Manage your wedding details (names, date, venue, location), currency preferences, and data backup. Export a full JSON backup at any time. Import a previous backup to restore or merge data. Download Excel templates for bulk-importing guests, vendors, budget items, rooms, checklist tasks, and events.

---

## Currency Support

The app supports GBP (£) and IDR (Rp). All amounts are stored internally in GBP. When entering an amount in IDR, the app fetches a live mid-market exchange rate (from the European Central Bank via the Frankfurter API) and converts it automatically. You can toggle the display currency at any time and optionally show both currencies side by side. Rates are cached for 12 hours; a warning appears if rates are more than 8 hours old.

---

## How Data Is Stored

All data is stored in your browser's localStorage. This means:

- **It's instant** — no server round-trips, no loading spinners
- **It's private** — data never leaves your device
- **It's per-browser** — the data on your MacBook is not the same as on your phone unless you export and import

**Export your data regularly.** Use the Export button in the top bar or go to Settings → Export. Keep the JSON file somewhere safe (cloud storage, email to yourself). If you clear your browser data, your planning data will be lost without a backup.

---

## Known Limitations (Current Version)

- **Single device only** — data does not sync between devices automatically
- **Browser-bound** — clearing browser data / private mode will lose data
- **No user accounts** — anyone with access to the browser can see the data
- **No offline image storage for the Mood Board on iOS** — large base64 images may hit localStorage limits on mobile browsers

---

## Future Plans

The app is architected for a future migration to **Supabase** (a hosted Postgres database with real-time sync). When that migration happens:

- Data will sync across all devices instantly
- Both Jamie and Beth will be able to edit simultaneously
- Backups will be automatic
- The app will remain free to use

The data service layer is already separated from the UI so the migration will not require changes to any pages.

---

## Tech Stack

- **React 19** + **TypeScript** — UI and type safety
- **Vite** — fast local development and build
- **Recharts** — budget and financial charts
- **@hello-pangea/dnd** — drag and drop (seating, accommodation)
- **xlsx (SheetJS)** — Excel template generation
- **Frankfurter API** — live GBP/IDR exchange rates

---

*Built with care for Jamie & Beth · Canggu, Bali · April 2028*
