import { and, between, eq, gte, inArray, lte } from 'drizzle-orm'
import { db } from '@/shared/lib/db.server'
import {
  breaks,
  holidays,
  leaveRequests,
  memberships,
  monthlyLocks,
  timeEntries,
  users,
} from '@/db/schema'
import type { ApiCallerContext } from '@/shared/server/apiAuth'
import type { LeaveType } from '@/features/leave-request'
import { scheduledWorkingDays } from '@/features/holidays'
import {
  computeMonthlyBreakdown,
  deriveWorkSegments,
  isLegalHoliday,
  totalMinutes,
  type BreakSegment,
  type DayInput,
} from '@/features/labor'
import type { MemberMonthlySummary, OrgMonthlySummary } from '../types'
import { countLeaveDaysInMonth, type ApprovedLeaveSlice } from '../leaveCount'

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
  // 当月末日 (date 型は LIKE 不可なので範囲比較で抽出)
  const monthLastDayStr = `${yearMonth}-${String(
    new Date(
      Date.UTC(Number(yearMonth.slice(0, 4)), Number(yearMonth.slice(5, 7)), 0),
    ).getUTCDate(),
  ).padStart(2, '0')}`

  if (userIds.length === 0) {
    const holidayRows = await db
      .select()
      .from(holidays)
      .where(
        and(
          eq(holidays.organizationId, ctx.organization.id),
          gte(holidays.date, monthStart),
          lte(holidays.date, monthLastDayStr),
        ),
      )
    return {
      yearMonth,
      isLocked: false,
      lockedAt: null,
      scheduledWorkingDays: scheduledWorkingDays(
        yearMonth,
        holidayRows.map((h) => h.date),
      ),
      members: [],
    }
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
  // 月次サマリ用の合計分 (互換) と、labor 計算用の生 break セグメント配列の両方を保持。
  const breakMinutesByEntry = new Map<string, number>()
  const breakSegmentsByEntry = new Map<string, BreakSegment[]>()
  for (const b of breakRows) {
    const m = diffMinutes(b.startAt, b.endAt)
    breakMinutesByEntry.set(
      b.timeEntryId,
      (breakMinutesByEntry.get(b.timeEntryId) ?? 0) + m,
    )
    const arr = breakSegmentsByEntry.get(b.timeEntryId) ?? []
    arr.push({ startAt: b.startAt, endAt: b.endAt })
    breakSegmentsByEntry.set(b.timeEntryId, arr)
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

  // 当月にかかる承認済み休暇 (start_date <= 月末 AND end_date >= 月初)
  const monthLastDay = new Date(
    Date.UTC(Number(yearMonth.slice(0, 4)), Number(yearMonth.slice(5, 7)), 0),
  )
    .toISOString()
    .slice(0, 10)
  const leaveRows = await db
    .select()
    .from(leaveRequests)
    .where(
      and(
        eq(leaveRequests.organizationId, ctx.organization.id),
        eq(leaveRequests.status, 'approved'),
        inArray(leaveRequests.requesterUserId, userIds),
        lte(leaveRequests.startDate, monthLastDay),
        gte(leaveRequests.endDate, monthStart),
      ),
    )
  const leavesByUser = new Map<string, ApprovedLeaveSlice[]>()
  for (const lv of leaveRows) {
    const arr = leavesByUser.get(lv.requesterUserId) ?? []
    arr.push({
      leaveType: lv.leaveType as LeaveType,
      startDate: lv.startDate,
      endDate: lv.endDate,
    })
    leavesByUser.set(lv.requesterUserId, arr)
  }

  const fallbackEnd = new Date()
  const legalHolidayPolicy = {
    legalHolidayDow: ctx.organization.legalHolidayDow,
  }

  const members: MemberMonthlySummary[] = memberRows.map((r) => {
    const entries = entriesByUser.get(r.u.id) ?? []
    let workingMinutes = 0
    let breakMinutes = 0
    let workingDays = 0
    const dayInputs: DayInput[] = []
    for (const e of entries) {
      if (!e.clockInAt) continue
      const segs = deriveWorkSegments(
        { clockInAt: e.clockInAt, clockOutAt: e.clockOutAt },
        breakSegmentsByEntry.get(e.id) ?? [],
        fallbackEnd,
      )
      const dayWorking = totalMinutes(segs)
      workingMinutes += dayWorking
      breakMinutes += breakMinutesByEntry.get(e.id) ?? 0
      workingDays += 1
      dayInputs.push({
        workDate: e.workDate,
        workSegments: segs,
        // 法定休日判定は workDate (JST) の曜日を見る
        isLegalHoliday: isLegalHoliday(
          new Date(`${e.workDate}T00:00:00+09:00`),
          legalHolidayPolicy,
        ),
      })
    }
    const breakdown = computeMonthlyBreakdown(dayInputs, r.m.laborCategory)
    const { paidLeaveDays, otherLeaveDays } = countLeaveDaysInMonth(
      leavesByUser.get(r.u.id) ?? [],
      yearMonth,
    )
    return {
      userId: r.u.id,
      userName: r.u.name,
      userEmail: r.u.email,
      workingDays,
      workingMinutes,
      breakMinutes,
      // legacy 互換: legalOvertime と同じ値を出す
      overtimeMinutes: breakdown.totalLegalOvertimeMinutes,
      paidLeaveDays,
      otherLeaveDays,
      legalOvertimeMinutes: breakdown.totalLegalOvertimeMinutes,
      legalOvertimeOver60Minutes: breakdown.legalOvertimeOver60Minutes,
      lateNightMinutes: breakdown.totalLateNightMinutes,
      legalHolidayWorkedMinutes: breakdown.legalHolidayWorkedMinutes,
    }
  })

  // 当月の公休 → scheduledWorkingDays
  const holidayRows = await db
    .select()
    .from(holidays)
    .where(
      and(
        eq(holidays.organizationId, ctx.organization.id),
        gte(holidays.date, monthStart),
        lte(holidays.date, monthLastDayStr),
      ),
    )
  const scheduled = scheduledWorkingDays(
    yearMonth,
    holidayRows.map((h) => h.date),
  )

  return {
    yearMonth,
    isLocked: !!lock,
    lockedAt: lock ? lock.lockedAt.toISOString() : null,
    scheduledWorkingDays: scheduled,
    members,
  }
}

/**
 * 自分の月次サマリ。getOrgMonthlySummaryHandler から自分の行だけ取り出す。
 * 重い org-wide query を呼んでいるので将来は専用 query に分けて最適化したい。
 */
export async function getMyMonthlySummaryHandler(
  ctx: ApiCallerContext,
  yearMonth: string,
): Promise<{
  yearMonth: string
  scheduledWorkingDays: number
  isLocked: boolean
  member: MemberMonthlySummary | null
}> {
  const org = await getOrgMonthlySummaryHandler(ctx, yearMonth)
  const member = org.members.find((m) => m.userId === ctx.user.id) ?? null
  return {
    yearMonth: org.yearMonth,
    scheduledWorkingDays: org.scheduledWorkingDays,
    isLocked: org.isLocked,
    member,
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
