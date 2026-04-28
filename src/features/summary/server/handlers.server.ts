import { and, between, eq, inArray } from 'drizzle-orm'
import { db } from '@/shared/lib/db.server'
import {
  breaks,
  memberships,
  monthlyLocks,
  timeEntries,
  users,
} from '@/db/schema'
import type { ApiCallerContext } from '@/shared/server/apiAuth'
import type { MemberMonthlySummary, OrgMonthlySummary } from '../types'

function nextMonthFirstDay(yearMonth: string): string {
  const [y, m] = yearMonth.split('-').map(Number)
  const ym = (y as number) * 12 + ((m as number) - 1) + 1
  return `${Math.floor(ym / 12)}-${String((ym % 12) + 1).padStart(2, '0')}-01`
}

function diffMinutes(start: Date, end: Date | null): number {
  const e = end ?? new Date()
  return Math.max(0, Math.round((e.getTime() - start.getTime()) / 60_000))
}

export async function getOrgMonthlySummaryHandler(
  ctx: ApiCallerContext,
  yearMonth: string,
): Promise<OrgMonthlySummary> {
  const monthStart = `${yearMonth}-01`
  const next = nextMonthFirstDay(yearMonth)

  const memberRows = await db
    .select({ m: memberships, u: users })
    .from(memberships)
    .innerJoin(users, eq(users.id, memberships.userId))
    .where(eq(memberships.organizationId, ctx.organization.id))

  const userIds = memberRows.map((r) => r.u.id)
  if (userIds.length === 0) {
    return { yearMonth, isLocked: false, lockedAt: null, members: [] }
  }

  const entryRows = await db
    .select()
    .from(timeEntries)
    .where(
      and(
        eq(timeEntries.organizationId, ctx.organization.id),
        inArray(timeEntries.userId, userIds),
        between(timeEntries.workDate, monthStart, next),
      ),
    )
  const entriesByUser = new Map<string, typeof entryRows>()
  for (const e of entryRows) {
    if (e.workDate.slice(0, 7) !== yearMonth) continue
    const arr = entriesByUser.get(e.userId) ?? []
    arr.push(e)
    entriesByUser.set(e.userId, arr)
  }

  const entryIds = entryRows.map((e) => e.id)
  const breakRows =
    entryIds.length > 0
      ? await db.select().from(breaks).where(inArray(breaks.timeEntryId, entryIds))
      : []
  const breaksByEntry = new Map<string, number>()
  for (const b of breakRows) {
    const m = diffMinutes(b.startAt, b.endAt)
    breaksByEntry.set(b.timeEntryId, (breaksByEntry.get(b.timeEntryId) ?? 0) + m)
  }

  const lockRows = await db
    .select()
    .from(monthlyLocks)
    .where(
      and(
        eq(monthlyLocks.organizationId, ctx.organization.id),
        eq(monthlyLocks.yearMonth, yearMonth),
      ),
    )
    .limit(1)
  const lock = lockRows[0]

  const members: MemberMonthlySummary[] = memberRows.map((r) => {
    const entries = entriesByUser.get(r.u.id) ?? []
    let workingMinutes = 0
    let breakMinutes = 0
    let workingDays = 0
    for (const e of entries) {
      if (!e.clockInAt) continue
      const total = diffMinutes(e.clockInAt, e.clockOutAt)
      const bm = breaksByEntry.get(e.id) ?? 0
      workingMinutes += Math.max(0, total - bm)
      breakMinutes += bm
      workingDays += 1
    }
    return {
      userId: r.u.id,
      userName: r.u.name,
      userEmail: r.u.email,
      workingDays,
      workingMinutes,
      breakMinutes,
    }
  })

  return {
    yearMonth,
    isLocked: !!lock,
    lockedAt: lock ? lock.lockedAt.toISOString() : null,
    members,
  }
}

export async function lockMonthHandler(
  ctx: ApiCallerContext,
  yearMonth: string,
): Promise<{ ok: true }> {
  const existing = await db
    .select()
    .from(monthlyLocks)
    .where(
      and(
        eq(monthlyLocks.organizationId, ctx.organization.id),
        eq(monthlyLocks.yearMonth, yearMonth),
      ),
    )
    .limit(1)
  if (existing.length > 0) {
    const e = new Error('ALREADY_LOCKED')
    ;(e as { code?: string }).code = 'ALREADY_LOCKED'
    throw e
  }
  await db.insert(monthlyLocks).values({
    organizationId: ctx.organization.id,
    yearMonth,
    lockedByUserId: ctx.user.id,
  })
  return { ok: true }
}

export async function unlockMonthHandler(
  ctx: ApiCallerContext,
  yearMonth: string,
): Promise<{ ok: true }> {
  await db
    .delete(monthlyLocks)
    .where(
      and(
        eq(monthlyLocks.organizationId, ctx.organization.id),
        eq(monthlyLocks.yearMonth, yearMonth),
      ),
    )
  return { ok: true }
}
