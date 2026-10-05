// Accommodation and meals — what guests pay Jamie and Beth.
// Schedule from the 5 October 2026 note. Amounts are per guest, in GBP.
// "End of" a month is the last calendar day of that month. 2028 is a leap year.

import type { Guest, GuestStayPayment } from '../types'
import { guestDisplayName } from './helpers'

export const STAY_SCHEDULE = [
  { id: '2026-11', label: 'End of November 2026', due: '2026-11-30', perGuest: 25 },
  { id: '2027-03', label: 'End of March 2027',    due: '2027-03-31', perGuest: 100 },
  { id: '2027-05', label: 'End of May 2027',      due: '2027-05-31', perGuest: 110 },
  { id: '2027-07', label: 'End of July 2027',     due: '2027-07-31', perGuest: 110 },
  { id: '2027-11', label: 'End of November 2027', due: '2027-11-30', perGuest: 111 },
  { id: '2028-02', label: 'End of February 2028', due: '2028-02-29', perGuest: 100 },
] as const

export const STAY_PER_GUEST = STAY_SCHEDULE.reduce((sum, row) => sum + row.perGuest, 0)

/** Hidden field on the first guest row so the ledger survives inside the guests JSON column. */
export const STAY_LEDGER_FIELD = '__guestStayPayments'

export const GUESTS_TAB_STORAGE_KEY = 'jb-open-guests-tab'

export type StayInstalmentStatus = 'paid' | 'overdue' | 'partial' | 'upcoming'

export interface StayInstalment {
  id: string
  label: string
  due: string
  perGuest: number
  dueAmount: number
  covered: number
  remaining: number
  status: StayInstalmentStatus
}

export interface StayParty {
  partyKey: string
  label: string
  guests: Guest[]
  guestCount: number
  totalDue: number
  totalPaid: number
  balance: number
  overdueAmount: number
  instalments: StayInstalment[]
  payments: GuestStayPayment[]
}

function pence(n: number): number {
  return Math.round(Number(n) * 100)
}

function fromPence(n: number): number {
  return n / 100
}

export function stayPartyKey(guest: Guest): string {
  const party = (guest.partyName ?? '').trim()
  if (party) return `party:${party.toLowerCase()}`
  return `guest:${guest.id}`
}

function dueEndMs(isoDate: string): number {
  return new Date(`${isoDate}T23:59:59`).getTime()
}

export function instalmentsForParty(
  guestCount: number,
  payments: GuestStayPayment[],
  today: Date,
): StayInstalment[] {
  let remainingPaid = payments.reduce((sum, p) => sum + pence(p.amount), 0)
  const todayMs = today.getTime()

  return STAY_SCHEDULE.map(row => {
    const dueAmount = pence(row.perGuest) * guestCount
    const covered = Math.min(remainingPaid, dueAmount)
    remainingPaid -= covered
    const remaining = dueAmount - covered
    const past = todayMs > dueEndMs(row.due)
    let status: StayInstalmentStatus
    if (remaining <= 0) status = 'paid'
    else if (past) status = 'overdue'
    else if (covered > 0) status = 'partial'
    else status = 'upcoming'
    return {
      id: row.id,
      label: row.label,
      due: row.due,
      perGuest: row.perGuest,
      dueAmount: fromPence(dueAmount),
      covered: fromPence(covered),
      remaining: fromPence(remaining),
      status,
    }
  })
}

function attendingGuests(guests: Guest[]): Guest[] {
  return guests.filter(g => g.attending !== 'no')
}

export function stayParties(guests: Guest[], payments: GuestStayPayment[] | undefined, today = new Date()): StayParty[] {
  const people = attendingGuests(guests)
  const groups = new Map<string, Guest[]>()
  for (const guest of people) {
    const key = stayPartyKey(guest)
    const list = groups.get(key)
    if (list) list.push(guest)
    else groups.set(key, [guest])
  }

  const parties: StayParty[] = []
  for (const [partyKey, members] of groups) {
    const partyPayments = (payments ?? []).filter(p => p.partyKey === partyKey)
    const instalments = instalmentsForParty(members.length, partyPayments, today)
    const totalDue = fromPence(pence(STAY_PER_GUEST) * members.length)
    const totalPaid = fromPence(partyPayments.reduce((sum, p) => sum + pence(p.amount), 0))
    const balance = fromPence(Math.max(0, pence(totalDue) - pence(totalPaid)))
    const overdueAmount = fromPence(instalments.reduce((sum, row) => sum + (row.status === 'overdue' ? pence(row.remaining) : 0), 0))
    const named = (members[0]?.partyName ?? '').trim()
    const label = named || guestDisplayName(members[0])
    parties.push({
      partyKey,
      label,
      guests: members,
      guestCount: members.length,
      totalDue,
      totalPaid,
      balance,
      overdueAmount,
      instalments,
      payments: [...partyPayments].sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id)),
    })
  }

  parties.sort((a, b) => {
    if (a.overdueAmount > 0 && b.overdueAmount === 0) return -1
    if (b.overdueAmount > 0 && a.overdueAmount === 0) return 1
    return a.label.localeCompare(b.label)
  })
  return parties
}

export function countOverdueStayParties(guests: Guest[], payments: GuestStayPayment[] | undefined, today = new Date()): number {
  return stayParties(guests, payments, today).filter(p => p.overdueAmount > 0).length
}

export function formatStayMoney(n: number): string {
  const rounded = fromPence(pence(n))
  const hasPence = pence(n) % 100 !== 0
  return '£' + rounded.toLocaleString('en-GB', {
    minimumFractionDigits: hasPence ? 2 : 0,
    maximumFractionDigits: 2,
  })
}

type GuestWithLedger = Guest & { [STAY_LEDGER_FIELD]?: GuestStayPayment[] }

/** Pull a ledger that was stored on a guest row, and return guests without that field. */
export function detachStayLedger(guests: Guest[]): { guests: Guest[]; payments: GuestStayPayment[] } {
  let payments: GuestStayPayment[] = []
  const clean = guests.map(guest => {
    const raw = guest as GuestWithLedger
    if (Array.isArray(raw[STAY_LEDGER_FIELD])) payments = raw[STAY_LEDGER_FIELD]
    if (!(STAY_LEDGER_FIELD in raw)) return guest
    const { [STAY_LEDGER_FIELD]: _drop, ...rest } = raw
    return rest
  })
  return { guests: clean, payments }
}

/** Attach the ledger to the first guest so it round-trips inside the guests JSON column. */
export function embedStayLedger(guests: Guest[], payments: GuestStayPayment[] | undefined): Guest[] {
  const ledger = payments ?? []
  return guests.map((guest, index) => {
    const raw = guest as GuestWithLedger
    const { [STAY_LEDGER_FIELD]: _drop, ...rest } = raw
    // An empty ledger is omitted so a cleared log does not stay on the guest row.
    if (index === 0 && ledger.length > 0) return { ...rest, [STAY_LEDGER_FIELD]: ledger }
    return rest
  })
}
