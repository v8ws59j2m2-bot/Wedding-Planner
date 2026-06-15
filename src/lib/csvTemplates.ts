// ─────────────────────────────────────────────────────────────────────────────
// CSV template generator
// Generates simple, clean .csv import templates with example data.
// CSV is the format the app actually imports — simpler and more reliable than xlsx.
// ─────────────────────────────────────────────────────────────────────────────

function esc(v: string | number | boolean): string {
  const s = String(v)
  // Quote if contains comma, newline, or double-quote
  if (s.includes(',') || s.includes('\n') || s.includes('"')) {
    return '"' + s.replace(/"/g, '""') + '"'
  }
  return s
}

function buildCSV(headers: string[], rows: (string | number)[][]): string {
  return [headers.map(esc).join(','), ...rows.map(r => r.map(esc).join(','))].join('\n')
}

function download(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

// ── Guests ────────────────────────────────────────────────────────────────────
export function downloadGuestsTemplate() {
  const headers = ['First Name', 'Last Name', 'Party Name', 'Age Category', 'Email', 'Meal', 'Notes']
  const rows = [
    ['James', 'Harrison', 'Harrison Family', 'adult', 'james.harrison@email.com', 'Chicken', 'Groomsman'],
    ['Sophie', 'Harrison', 'Harrison Family', 'adult', 'sophie.harrison@email.com', 'Fish', 'Plus one'],
    ['Lily',   'Harrison', 'Harrison Family', 'child', '', 'Kids menu', 'Age 6'],
    ['Marcus', 'Cole',     'Cole Family',     'adult', 'marcus.cole@email.com', 'Vegetarian', 'Best man'],
  ]
  download('guests-template.csv', buildCSV(headers, rows))
}

// ── Vendors ───────────────────────────────────────────────────────────────────
export function downloadVendorsTemplate() {
  const headers = ['Name', 'Category', 'Contact Person', 'Phone', 'Email', 'Website', 'Notes']
  const rows = [
    ['Villa Purnama',              'Venue',       'Kadek',  '+62 812 3456 7890', 'kadek@villapurnama.com', 'https://villapurnama.com', 'Includes ceremony lawn and reception space'],
    ['Bali Moments Photography',   'Photography', 'Wayan',  '+62 813 9876 5432', 'wayan@balimoments.com',  '', '8 hour package, 2 photographers'],
    ['Sacred Garden Florals',      'Florals',     'Made',   '', 'made@sacredgarden.com', '', 'Quote received Mar 2027'],
    ['Sinar Catering Co.',         'Catering',    'Putu',   '+62 821 1111 2222', 'putu@sinarcatering.com', '', 'Set menu for 80 pax'],
  ]
  download('vendors-template.csv', buildCSV(headers, rows))
}

// ── Budget / Expenses ─────────────────────────────────────────────────────────
export function downloadBudgetTemplate() {
  const headers = ['Description', 'Category', 'Status', 'Budget Amount (GBP)', 'Vendor Name', 'Notes']
  const rows = [
    ['Villa hire — full week',        'Venue',       'booked', 12000, 'Villa Purnama',             'Includes ceremony and reception'],
    ['Wedding photography 8hrs',      'Photography', 'booked', 3200,  'Bali Moments Photography',  '2 photographers, full day'],
    ['Floral arch and table displays', 'Flowers & Décor', 'quoted', 2500, 'Sacred Garden Florals', 'Quote valid until June 2027'],
    ['Catering — 80 guests',          'Catering',    'booked', 6400,  'Sinar Catering Co.',        'Includes welcome drinks'],
  ]
  download('budget-template.csv', buildCSV(headers, rows))
}

// ── Accommodation ─────────────────────────────────────────────────────────────
export function downloadAccommodationTemplate() {
  const headers = ['Room Name', 'Room Type', 'Capacity', 'Notes']
  const rows = [
    ['Villa Bunga — Master Suite',  'Villa',         4, 'King bed, private pool, ground floor'],
    ['Villa Bunga — Garden Room 1', 'Suite',         2, 'Queen bed, garden view, ensuite'],
    ['Villa Bunga — Garden Room 2', 'Standard Room', 2, 'Twin beds, garden view'],
    ['Pool House',                  'Family Room',   6, '2 bedrooms + bunk room, ideal for families'],
  ]
  download('accommodation-template.csv', buildCSV(headers, rows))
}

// ── Events & Activities ───────────────────────────────────────────────────────
export function downloadEventsTemplate() {
  const headers = [
    'Title', 'Type', 'Date', 'Start Time', 'End Time',
    'Location', 'Description', 'Dress Code', 'Transport',
    'Free or Paid', 'Cost Per Person (GBP)', 'Payment Method',
    'Include in Itinerary',
  ]
  const rows = [
    ['Welcome Dinner',       'wedding',  '2028-04-05', '19:00', '22:00', 'Villa Purnama — Terrace', 'Casual welcome dinner for all arriving guests', 'Smart casual', 'Shuttle from Seminyak 18:30', '', '', '', 'yes'],
    ['Wedding Ceremony',     'wedding',  '2028-04-07', '16:00', '17:30', 'Villa Purnama — Lawn',    'Ceremony with Balinese blessing. Guests seated by 15:45', 'White / cream / formal', 'Self-arranged', '', '', '', 'yes'],
    ['Tanah Lot Sunset Tour','activity', '2028-04-06', '15:00', '20:00', 'Tanah Lot Temple, Tabanan','Visit the iconic sea temple at sunset with local guide', '', 'Minibus departs villa 15:00', 'paid', 45, 'couple', 'yes'],
    ['Farewell Brunch',      'wedding',  '2028-04-15', '10:00', '13:00', 'Villa Purnama — Terrace', 'Final morning together. Casual buffet brunch', 'Casual / resort wear', '', '', '', '', 'yes'],
  ]
  download('events-activities-template.csv', buildCSV(headers, rows))
}

// ── Checklist ─────────────────────────────────────────────────────────────────
export function downloadChecklistTemplate() {
  const headers = ['Title', 'Category', 'Priority', 'Due Date', 'Notes']
  const rows = [
    ['Book venue and sign contract', 'Venue',          'high',   '2026-09-01', 'Confirm villa availability for 5-15 April 2028'],
    ['Book photographer',           'Photography',    'high',   '2026-10-01', 'Shortlist 3 options and review portfolios'],
    ['Send save the dates',          'Stationery',    'high',   '2027-01-15', 'International guests need 15+ months notice'],
    ['Book florist',                 'Flowers & Décor','medium', '2027-03-01', 'Meet at venue to discuss arch and table designs'],
    ['Plan honeymoon',               'Honeymoon',     'low',    '2027-09-01', 'Considering Lombok or the Gilis post-wedding'],
  ]
  download('checklist-template.csv', buildCSV(headers, rows))
}
