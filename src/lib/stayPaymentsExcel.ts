// Excel download of the stay-payment tracker. Amounts are numbers, in GBP.
import * as XLSX from 'xlsx'
import { guestDisplayName } from './helpers'
import { STAY_PER_GUEST, STAY_SCHEDULE, type StayParty } from './stayPayments'

const STATUS_LABEL = {
  paid: 'Paid',
  overdue: 'Overdue',
  partial: 'Part paid',
  upcoming: 'Upcoming',
} as const

function sheet(rows: (string | number)[][]): XLSX.WorkSheet {
  const ws = XLSX.utils.aoa_to_sheet(rows)
  const widths = (rows[0] ?? []).map((_, col) => {
    const longest = rows.reduce((max, row) => Math.max(max, String(row[col] ?? '').length), 8)
    return { wch: Math.min(longest + 2, 48) }
  })
  ws['!cols'] = widths
  return ws
}

function todayStamp(): string {
  const d = new Date()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

/** Workbook of every party's balance, instalments, and logged payments. */
export function buildStayPaymentsWorkbook(parties: StayParty[]): XLSX.WorkBook {
  const wb = XLSX.utils.book_new()

  const partyRows: (string | number)[][] = [
    ['Party', 'Guests', 'Guest count', 'Total due (GBP)', 'Paid (GBP)', 'Outstanding (GBP)', 'Overdue (GBP)'],
  ]
  for (const party of parties) {
    partyRows.push([
      party.label,
      party.guests.map(guestDisplayName).join(', '),
      party.guestCount,
      party.totalDue,
      party.totalPaid,
      party.balance,
      party.overdueAmount,
    ])
  }
  const totals = parties.reduce(
    (acc, party) => {
      acc.count += party.guestCount
      acc.due += party.totalDue
      acc.paid += party.totalPaid
      acc.balance += party.balance
      acc.overdue += party.overdueAmount
      return acc
    },
    { count: 0, due: 0, paid: 0, balance: 0, overdue: 0 },
  )
  partyRows.push(['Total', '', totals.count, totals.due, totals.paid, totals.balance, totals.overdue])
  XLSX.utils.book_append_sheet(wb, sheet(partyRows), 'Parties')

  const instalmentRows: (string | number)[][] = [
    ['Party', 'Instalment', 'Due date', 'Per guest (GBP)', 'Due (GBP)', 'Covered (GBP)', 'Remaining (GBP)', 'Status'],
  ]
  for (const party of parties) {
    for (const row of party.instalments) {
      instalmentRows.push([
        party.label,
        row.label,
        row.due,
        row.perGuest,
        row.dueAmount,
        row.covered,
        row.remaining,
        STATUS_LABEL[row.status],
      ])
    }
  }
  XLSX.utils.book_append_sheet(wb, sheet(instalmentRows), 'Instalments')

  const paymentRows: (string | number)[][] = [
    ['Party', 'Date received', 'Amount (GBP)', 'Note'],
  ]
  for (const party of parties) {
    for (const payment of party.payments) {
      paymentRows.push([party.label, payment.date, payment.amount, payment.note ?? ''])
    }
  }
  XLSX.utils.book_append_sheet(wb, sheet(paymentRows), 'Payments')

  const scheduleRows: (string | number)[][] = [
    ['Instalment', 'Due date', 'Per guest (GBP)'],
    ...STAY_SCHEDULE.map(row => [row.label, row.due, row.perGuest]),
    ['Total per guest', '', STAY_PER_GUEST],
  ]
  XLSX.utils.book_append_sheet(wb, sheet(scheduleRows), 'Schedule')

  const notes: (string | number)[][] = [
    ['Stay payments', 'Accommodation and meals that guests pay Jamie and Beth.'],
    ['Currency', 'Every amount is GBP.'],
    ['Who is included', 'Everyone attending, including children. Guests marked as not attending are left out.'],
    ['Parties', 'Guests who share a party name share one balance. A guest with no party name is their own party.'],
    ['How payments apply', 'Money is applied to the earliest instalment first. An early payment reduces what is still owed later.'],
    ['Overdue', 'An instalment is overdue when its due date has passed and payments so far do not cover it.'],
    ['Where this is saved', 'The log is stored in Supabase with the guest list for the signed-in account. This file is a copy for Excel.'],
  ]
  XLSX.utils.book_append_sheet(wb, sheet(notes), 'Notes')

  return wb
}

/** Download every party's balance, instalments, and logged payments. */
export function downloadStayPaymentsWorkbook(parties: StayParty[]): void {
  XLSX.writeFile(buildStayPaymentsWorkbook(parties), `stay-payments-${todayStamp()}.xlsx`)
}
