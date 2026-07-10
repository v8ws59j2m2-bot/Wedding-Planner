# Quick Start Guide

## Jamie & Beth Wedding Planner — Getting Started

Welcome to your wedding planning app. This guide will get you up and running in about 15 minutes.

---

## 1. Opening the App

The app runs in your browser. Open it the same way you would any website. Once it's open, you'll see the **Dashboard** — your central planning hub.

The **sidebar** on the left is your main navigation.

---

## 2. First Things to Do

Before adding any guests or vendors, spend five minutes setting up your wedding details.

**Go to Settings (bottom of the sidebar)**

Fill in:
- Your names (Partner 1 / Partner 2)
- Wedding date
- Venue name
- Location
- Time
- Theme

This information is used throughout the app — the countdown timer, the guest itinerary, and more. Click **Save details** when done.

---

## 3. Section by Section — What Each One Is For

| Section          | What it's for                                      |
|------------------|----------------------------------------------------|
| **Dashboard**    | Overview of everything. Check here regularly.      |
| **Guest List**   | Add and manage all your confirmed guests.          |
| **Budget**       | Track all expenses — both confirmed and provisional. |
| **Checklist**    | Your to-do list, organised by planning phase.      |
| **Vendors**      | Directory of all your suppliers and their details. |
| **Mood Board**   | Visual inspiration board with images and colour palette. |
| **Seating Chart**| Assign guests to tables using drag and drop.       |
| **Accommodation**| Assign guests to rooms across your villas.         |
| **Finances**     | Big-picture financial overview — charts and insights. |
| **Events**       | Plan wedding events and optional group activities. |
| **Itinerary**    | Build and print a guest welcome book / schedule.   |
| **Settings**     | Wedding details, currency, data backup, and templates. |

---

## 4. Adding Guests

Go to **Guest List** and click **Add guest**.

For each guest, fill in:
- First name and last name
- Party / family name
- Age category: Adult or Child
- Meal preference (optional)
- Email address (optional)
- Notes (optional)

**Importing guests in bulk:** Go to Settings → Download Excel Template → Guests, fill in the template, then import.

---

## 5. Adding Vendors

Go to **Vendors** and click **Add**.

Fill in the vendor's name, category, status (Quoted or Booked), and any contact details.

**Status matters:**
- **Quoted** — you have a quote but haven't committed.
- **Booked** — confirmed supplier. Link expenses to this vendor on the Budget page.

---

## 6. Budget & Expenses

Go to **Budget** and click **Add expense**.

Every expense must be linked to a vendor.

When adding an expense:
1. Choose **Booked** or **Quoted**
2. Select the vendor from the dropdown
3. Add a description
4. Enter the budget amount in GBP or IDR
5. Click **Add expense**

After saving, you can record payments (deposits, balances, etc.). The app calculates the outstanding balance automatically.

---

## 7. Events & Activities

Go to **Events** and click **Add**.

**Wedding Events** (ceremony, welcome dinner, reception, etc.):
- Add title, date, time, location, dress code, and transport info.

**Optional Activities** (tours, spa days, cooking classes):
- Same fields as above, plus cost per person and payment tracking.

---

## 8. Accommodation

Go to **Accommodation** and click **Add room**.

Add each villa room or guesthouse room with a name, type, and capacity.

Once rooms are added, drag guests from the **Unallocated** sidebar onto rooms.

You can also request extra bedding (cots, rollaways) on any room.

---

## 9. Guest Itinerary

Go to **Itinerary** once you've added events.

Tick or untick events to control what appears in the printed document.

Add a welcome note on the right.

Click **Print / Save PDF** to export a clean, formatted guest welcome book.

---

## 10. Exporting and Importing Data

**This is important. Export regularly.**

The app currently stores data locally in your browser by default.

**To export:** Click the **Export** button in the top bar at any time. This downloads a single `.json` file containing everything.

**To import / restore:** Click **Import** in the top bar and choose:
- **Merge** — adds the imported data alongside what's already there
- **Replace all** — overwrites everything with the backup

**Tip:** Email yourself a backup after every significant planning session.

> **Note on Supabase migration:** A Supabase backend has been built and migration tooling is available. Once the migration is complete, data will sync across devices automatically and backups will happen in the cloud. You will be notified when this becomes the default experience.

---

## 11. Currency (GBP and IDR)

The app supports British Pounds (£) and Indonesian Rupiah (Rp).

- All amounts are stored internally in GBP
- When you enter an amount in IDR, it is automatically converted using a live exchange rate
- Use the currency toggle to switch display currency

---

## 12. Useful Tips

- **Dashboard first** — start each planning session here to see what needs attention
- **Export after every session** — takes 2 seconds
- **Use party names** — grouping guests by family or travelling party makes navigation much easier
- **Quoted vs Booked** — use Quoted for anything you're still deciding on
- **Activities vs Budget** — activity costs are tracked on the Events page, not the Budget page
- **Checklist for deadlines** — add everything to the Checklist with due dates

---

## Need Help?

The app is under active development, including the migration to Supabase for real-time collaboration. If something doesn't work as expected or you want a new feature, raise it directly.

---

*Jamie & Beth Wedding Planner · Version in active development*