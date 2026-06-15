// ─────────────────────────────────────────────────────────────────────────────
// Excel template generator
// Uses the xlsx (SheetJS) library to generate .xlsx import templates with
// example data and an Instructions sheet for each section of the app.
// ─────────────────────────────────────────────────────────────────────────────

import * as XLSX from 'xlsx'

// ── helpers ───────────────────────────────────────────────────────────────────

function buildWorkbook(
  dataSheetName: string,
  headers: string[],
  rows: (string | number | boolean)[][][],   // rows of cells
  instructions: [string, string][]           // [column, explanation] pairs
): XLSX.WorkBook {
  const wb = XLSX.utils.book_new()

  // ── Data sheet ──
  const wsData = XLSX.utils.aoa_to_sheet([headers, ...rows.map(r => r.map(c => c[0]))])

  // Style header row bold by setting width hints
  const colWidths = headers.map((h, i) => {
    const maxLen = Math.max(h.length, ...rows.map(r => String(r[i]?.[0] ?? '').length)) + 2
    return { wch: Math.min(maxLen, 40) }
  })
  wsData['!cols'] = colWidths

  XLSX.utils.book_append_sheet(wb, wsData, dataSheetName)

  // ── Instructions sheet ──
  const instRows: (string | number)[][] = [
    ['Column', 'Description & Rules'],
    ...instructions.map(([col, desc]) => [col, desc]),
    ['', ''],
    ['HOW TO USE THIS TEMPLATE', ''],
    ['1. Fill in your data starting from row 2 on the "' + dataSheetName + '" sheet.', ''],
    ['2. Do not change the column headers in row 1.', ''],
    ['3. Delete the example rows before importing.', ''],
    ['4. Save as .xlsx and import via Settings → Import Data.', ''],
  ]
  const wsInst = XLSX.utils.aoa_to_sheet(instRows)
  wsInst['!cols'] = [{ wch: 35 }, { wch: 70 }]
  XLSX.utils.book_append_sheet(wb, wsInst, 'Instructions')

  return wb
}

function download(wb: XLSX.WorkBook, filename: string) {
  XLSX.writeFile(wb, filename)
}

// ── Guests ────────────────────────────────────────────────────────────────────
export function downloadGuestsTemplate() {
  const headers = ['First Name', 'Last Name', 'Party / Family Name', 'Age Category', 'Email', 'Meal Preference', 'Notes']
  const rows = [
    [['James'], ['Harrison'], ['Harrison Family'], ['adult'], ['james.harrison@email.com'], ['Chicken'], ['Groomsman']],
    [['Sophie'], ['Harrison'], ['Harrison Family'], ['adult'], ['sophie.harrison@email.com'], ['Fish'], ['Plus one']],
    [['Lily'], ['Harrison'], ['Harrison Family'], ['child'], [''], ['Kids menu'], ['Age 6']],
    [['Marcus'], ['Cole'], ['Cole Family'], ['adult'], ['marcus.cole@email.com'], ['Vegetarian'], ['Best man']],
  ]
  const instructions: [string, string][] = [
    ['First Name', 'Guest first name'],
    ['Last Name', 'Guest last name (optional)'],
    ['Party / Family Name', 'Group name used to link guests travelling together — e.g. "Harrison Family"'],
    ['Age Category', 'Must be exactly: adult OR child'],
    ['Email', 'Optional — used for contact purposes only'],
    ['Meal Preference', 'Optional — e.g. Chicken, Fish, Vegetarian, Vegan, Kids menu'],
    ['Notes', 'Any additional notes — dietary requirements, accessibility needs, etc.'],
  ]
  download(buildWorkbook('Guests', headers, rows, instructions), 'guests-template.xlsx')
}

// ── Vendors ───────────────────────────────────────────────────────────────────
export function downloadVendorsTemplate() {
  const headers = ['Name', 'Category', 'Status', 'Contact Person', 'Phone', 'Email', 'Website', 'Notes']
  const rows = [
    [['Villa Purnama'], ['Venue'], ['booked'], ['Kadek'], ['+62 812 3456 7890'], ['kadek@villapurnama.com'], ['https://villapurnama.com'], ['Includes ceremony lawn and reception space']],
    [['Bali Moments Photography'], ['Photography'], ['booked'], ['Wayan'], ['+62 813 9876 5432'], ['wayan@balimoments.com'], [''], ['8 hour package, 2 photographers']],
    [['Sacred Garden Florals'], ['Florals'], ['quoted'], ['Made'], [''], ['made@sacredgarden.com'], [''], ['Quote received Mar 2027, valid 3 months']],
    [['Sinar Catering Co.'], ['Catering'], ['quoted'], ['Putu'], ['+62 821 1111 2222'], ['putu@sinarcatering.com'], [''], ['Set menu for 80 pax, IDR quote pending']],
  ]
  const instructions: [string, string][] = [
    ['Name', 'Vendor / supplier name'],
    ['Category', 'One of: Venue, Photography, Videography, Catering, Florals, Hair & Beauty, Music & DJ, Officiant, Transport, Cake & Desserts, Stationery, Lighting & AV, Accommodation, Miscellaneous'],
    ['Status', 'Must be exactly: booked OR quoted'],
    ['Contact Person', 'Name of main contact at the vendor (optional)'],
    ['Phone', 'Vendor phone number (optional)'],
    ['Email', 'Vendor email address (optional)'],
    ['Website', 'Vendor website URL (optional)'],
    ['Notes', 'Any additional notes — package details, special requirements, etc.'],
  ]
  download(buildWorkbook('Vendors', headers, rows, instructions), 'vendors-template.xlsx')
}

// ── Budget / Expenses ─────────────────────────────────────────────────────────
export function downloadBudgetTemplate() {
  const headers = ['Description', 'Category', 'Status', 'Budget Amount (£)', 'Vendor Name', 'Notes']
  const rows = [
    [['Villa hire — full week'], ['Venue'], ['booked'], [12000], ['Villa Purnama'], ['Includes ceremony and reception spaces']],
    [['Wedding photography 8hrs'], ['Photography'], ['booked'], [3200], ['Bali Moments Photography'], ['2 photographers, full day']],
    [['Floral arch and table arrangements'], ['Flowers & Décor'], ['quoted'], [2500], ['Sacred Garden Florals'], ['Quote valid until June 2027']],
    [['Catering — 80 guests set menu'], ['Catering'], ['booked'], [6400], ['Sinar Catering Co.'], ['Includes welcome drinks and canapes']],
  ]
  const instructions: [string, string][] = [
    ['Description', 'Short description of the expense — e.g. "Wedding photography 8hrs"'],
    ['Category', 'One of: Venue, Catering, Photography, Videography, Flowers & Décor, Attire, Music & Entertainment, Hair & Beauty, Transport, Stationery, Honeymoon, Gifts & Favours, Miscellaneous'],
    ['Status', 'Must be exactly: booked OR quoted  •  Booked expenses affect budget totals; Quoted do not'],
    ['Budget Amount (£)', 'Total budgeted amount in GBP — numbers only, no £ symbol'],
    ['Vendor Name', 'Must exactly match the name of a vendor already in the app'],
    ['Notes', 'Optional notes — payment terms, deposit info, etc.'],
  ]
  download(buildWorkbook('Budget', headers, rows, instructions), 'budget-template.xlsx')
}

// ── Accommodation / Room Allocation ───────────────────────────────────────────
export function downloadAccommodationTemplate() {
  const headers = ['Room / Villa Name', 'Room Type', 'Capacity', 'Notes']
  const rows = [
    [['Villa Bunga — Master Suite'], ['Villa'], [4], ['King bed, private pool, ground floor']],
    [['Villa Bunga — Garden Room 1'], ['Suite'], [2], ['Queen bed, garden view, ensuite']],
    [['Villa Bunga — Garden Room 2'], ['Standard Room'], [2], ['Twin beds, garden view']],
    [['Pool House'], ['Family Room'], [6], ['2 bedrooms + bunk room, ideal for families']],
  ]
  const instructions: [string, string][] = [
    ['Room / Villa Name', 'Name used to identify the room — e.g. "Villa Bunga — Master Suite"'],
    ['Room Type', 'One of: Villa, Suite, Family Room, Standard Room, Other'],
    ['Capacity', 'Number of guests the room can accommodate (standard beds only) — whole number'],
    ['Notes', 'Optional — room features, floor, views, adjacency to other rooms, etc.'],
  ]
  download(buildWorkbook('Rooms', headers, rows, instructions), 'accommodation-template.xlsx')
}

// ── Events & Activities ───────────────────────────────────────────────────────
export function downloadEventsTemplate() {
  const headers = [
    'Title', 'Type', 'Date', 'Start Time', 'End Time',
    'Location', 'Description / Notes', 'Dress Code', 'Transport',
    'Free or Paid', 'Cost Per Person (£)', 'Payment Method',
    'Include in Itinerary',
  ]
  const rows = [
    [
      ['Welcome Dinner'], ['wedding'], ['2028-04-05'], ['19:00'], ['22:00'],
      ['Villa Purnama — Terrace'], ['Casual welcome dinner for all guests arriving Day 1. Cocktails from 7pm.'],
      ['Smart casual'], ['Shuttle from Seminyak at 18:30'],
      [''], [''], [''],
      ['yes'],
    ],
    [
      ['Wedding Ceremony'], ['wedding'], ['2028-04-07'], ['16:00'], ['17:30'],
      ['Villa Purnama — Ceremony Lawn'], ['Traditional Balinese blessing followed by ceremony. Guests to be seated by 15:45.'],
      ['White / cream / formal'], ['Self-arranged — villa is 10 min from Seminyak'],
      [''], [''], [''],
      ['yes'],
    ],
    [
      ['Tanah Lot Sunset Tour'], ['activity'], ['2028-04-06'], ['15:00'], ['20:00'],
      ['Tanah Lot Temple, Tabanan'], ['Visit the iconic sea temple at sunset. Includes minibus transfer and local guide.'],
      ['Comfortable walking shoes'], ['Minibus departs villa 15:00'],
      ['paid'], [45], ['couple'],
      ['yes'],
    ],
    [
      ['Cooking Class — Balinese Cuisine'], ['activity'], ['2028-04-08'], ['09:00'], ['13:00'],
      ['Paon Bali Cooking School, Ubud'], ['Learn to make 5 traditional dishes. Market visit included.'],
      ['Casual'], ['Private minibus from villa 08:00'],
      ['paid'], [65], ['self'],
      ['yes'],
    ],
    [
      ['Farewell Brunch'], ['wedding'], ['2028-04-15'], ['10:00'], ['13:00'],
      ['Villa Purnama — Pool Terrace'], ['Final morning together before guests depart. Casual buffet brunch.'],
      ['Casual / resort wear'], [''],
      [''], [''], [''],
      ['yes'],
    ],
  ]
  const instructions: [string, string][] = [
    ['Title', 'Name of the event or activity'],
    ['Type', 'Must be exactly: wedding OR activity'],
    ['Date', 'Date in YYYY-MM-DD format — e.g. 2028-04-07'],
    ['Start Time', 'Time in HH:MM format (24hr) — e.g. 16:00  •  Leave blank if not known'],
    ['End Time', 'Time in HH:MM format (24hr) — e.g. 17:30  •  Leave blank if not known'],
    ['Location', 'Venue or meeting point name and area'],
    ['Description / Notes', 'Details about the event — what to expect, what to bring, etc.'],
    ['Dress Code', 'Wedding events only — e.g. Smart casual, White tie, Resort wear  •  Leave blank for activities'],
    ['Transport', 'Wedding events only — transfer/shuttle info  •  Leave blank for activities'],
    ['Free or Paid', 'Activities only — must be: free OR paid  •  Leave blank for wedding events'],
    ['Cost Per Person (£)', 'Activities only — cost per person in GBP, numbers only  •  Leave blank if free or wedding event'],
    ['Payment Method', 'Activities only — must be: couple (guests pay you) OR self (guests pay vendor)  •  Leave blank for wedding events'],
    ['Include in Itinerary', 'Must be: yes OR no  •  yes = event appears in the printable guest itinerary'],
  ]
  download(buildWorkbook('Events & Activities', headers, rows, instructions), 'events-activities-template.xlsx')
}

// ── Checklist ─────────────────────────────────────────────────────────────────
export function downloadChecklistTemplate() {
  const headers = ['Title', 'Category', 'Priority', 'Due Date', 'Notes']
  const rows = [
    [['Book venue and sign contract'], ['Venue'], ['high'], ['2026-09-01'], ['Confirm villa availability for 5–15 April 2028']],
    [['Book photographer'], ['Photography'], ['high'], ['2026-10-01'], ['Shortlist 3 options and review portfolios']],
    [['Send save the dates'], ['Stationery'], ['high'], ['2027-01-15'], ['International guests need 15+ months notice']],
    [['Book florist'], ['Flowers & Décor'], ['medium'], ['2027-03-01'], ['Meet at venue to discuss arch and table designs']],
    [['Arrange travel insurance'], ['Miscellaneous'], ['medium'], ['2027-06-01'], ['Jamie and Beth + ensure all guests have cover']],
    [['Order wedding cake'], ['Catering'], ['medium'], ['2027-12-01'], ['Tasting session needed first']],
    [['Plan honeymoon'], ['Honeymoon'], ['low'], ['2027-09-01'], ['Considering Lombok or the Gilis post-wedding']],
  ]
  const instructions: [string, string][] = [
    ['Title', 'Short, actionable task description — e.g. "Book photographer"'],
    ['Category', 'One of: Venue, Photography, Videography, Catering, Flowers & Décor, Attire, Music & Entertainment, Hair & Beauty, Transport, Stationery, Honeymoon, Gifts & Favours, Miscellaneous'],
    ['Priority', 'Must be exactly: high OR medium OR low'],
    ['Due Date', 'Date in YYYY-MM-DD format — e.g. 2027-03-01  •  Leave blank if no deadline'],
    ['Notes', 'Optional extra detail or context for the task'],
  ]
  download(buildWorkbook('Checklist', headers, rows, instructions), 'checklist-template.xlsx')
}

// ── All-in-one ────────────────────────────────────────────────────────────────
export function downloadAllTemplates() {
  downloadGuestsTemplate()
  downloadVendorsTemplate()
  downloadBudgetTemplate()
  downloadAccommodationTemplate()
  downloadEventsTemplate()
  downloadChecklistTemplate()
}
