import { and, between, eq, inArray } from 'drizzle-orm'
import { db } from '@/shared/lib/db.server'
import { breaks, memberships, timeEntries, users } from '@/db/schema'
import type { ApiCallerContext } from '@/shared/server/apiAuth'
import { today } from '@/shared/lib/datetime'
import type { OrgTodayMember, OrgTodayStatus } from '../types'
import { computeOrgTodayCounts } from '../counts'
import {
  buildPastDays,
  computeDailyTrend,
  type DailyTrendPoint,
} from '../recentTrend'

function diffMinutes(start: Date, end: Date | null): number {
  const e = end ?? new Date()
  return Math.max(0, Math.round((e.getTime() - start.getTime()) / 60_000))
}

export async function getOrgTodayStatusHandler(
  ctx: ApiCallerContext,
): Promise<OrgTodayStatus> {
  const date = today()
  const memberRows = await db
    .select({ m: memberships, u: users })
    .from(memberships)
    .innerJoin(users, eq(users.id, memberships.userId))
    .where(eq(memberships.organizationId, ctx.organization.id))

  const userIds = memberRows.map((r) => r.u.id)
  const entryRows =
    userIds.length > 0
      ? await db
          .select()
          .from(timeEntries)
          .where(
            and(
              eq(timeEntries.organizationId, ctx.organization.id),
              eq(timeEntries.workDate, date),
              inArray(timeEntries.userId, userIds),
            ),
          )
      : []
  const entryByUser = new Map(entryRows.map((e) => [e.userId, e]))
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

  const members: OrgTodayMember[] = memberRows.map((r) => {
    const entry = entryByUser.get(r.u.id)
    if (!entry) {
      return {
        userId: r.u.id,
        userName: r.u.name,
        userEmail: r.u.email,
        role: r.m.role as OrgTodayMember['role'],
        status: 'not_started',
        clockInAt: null,
        clockOutAt: null,
        workingMinutes: 0,
        breakMinutes: 0,
      }
    }
    const bm = breaksByEntry.get(entry.id) ?? 0
    const total = entry.clockInAt
      ? diffMinutes(entry.clockInAt, entry.clockOutAt)
      : 0
    return {
      userId: r.u.id,
      userName: r.u.name,
      userEmail: r.u.email,
      role: r.m.role as OrgTodayMember['role'],
      status: entry.status,
      clockInAt: entry.clockInAt ? entry.clockInAt.toISOString() : null,
      clockOutAt: entry.clockOutAt ? entry.clockOutAt.toISOString() : null,
      workingMinutes: Math.max(0, total - bm),
      breakMinutes: bm,
    }
  })

  return { date, counts: computeOrgTodayCounts(members), members }
}

/**
 * 組織全体の過去 N 日推移 (default 7)。
 */
export async function getOrgRecentTrendHandler(
  ctx: ApiCallerContext,
  days = 7,
): Promise<{ days: DailyTrendPoint[] }> {
  const todayStr = today()
  const dates = buildPastDays(todayStr, days)
  const fromStr = dates[0]!
  const toStr = dates[dates.length - 1]!

  const entryRows = await db
    .select()
    .from(timeEntries)
    .where(
      and(
        eq(timeEntries.organizationId, ctx.organization.id),
        between(timeEntries.workDate, fromStr, toStr),
      ),
    )
  const entryIds = entryRows.map((e) => e.id)
  const breakRows =
    entryIds.length > 0
      ? await db.select().from(breaks).where(inArray(breaks.timeEntryId, entryIds))
      : []
  const entryDateById = new Map(entryRows.map((e) => [e.id, e.workDate]))

  // 休憩は entry id 単位で記録されているので、対応する workDate に集約
  const breaksByDate = new Map<string, number>()
  for (const b of breakRows) {
    const d = entryDateById.get(b.timeEntryId)
    if (!d) continue
    const m = b.endAt
      ? Math.max(0, Math.round((b.endAt.getTime() - b.startAt.getTime()) / 60_000))
      : 0
    breaksByDate.set(d, (breaksByDate.get(d) ?? 0) + m)
  }

  return {
    days: computeDailyTrend(
      dates,
      entryRows.map((e) => ({
        workDate: e.workDate,
        clockInAt: e.clockInAt,
        clockOutAt: e.clockOutAt,
      })),
      breaksByDate,
    ),
  }
}
