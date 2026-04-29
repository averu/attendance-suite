// 36 協定 (労基法 36 条) のアセスメントを org 全メンバー × 過去 12 ヶ月分で実行する。
//
// パフォーマンス上の注意:
//   - members × 12 ヶ月の time_entries + breaks をメモリで処理する。中小規模 (50 名以下) を想定。
//   - 月跨ぎは workDate (YYYY-MM-DD) で振り分けるので timezone 整合は呼び出し側 (apiAuth.legalHolidayDow) に依存。

import { and, eq, gte, inArray, lte } from 'drizzle-orm'
import { db } from '@/shared/lib/db.server'
import { breaks, memberships, timeEntries, users } from '@/db/schema'
import type { ApiCallerContext } from '@/shared/server/apiAuth'
import {
  assessSaburokuYear,
  computeMonthlyBreakdown,
  deriveWorkSegments,
  isLegalHoliday,
  type BreakSegment,
  type DayInput,
  type SaburokuMonthInput,
  type SaburokuYearFinding,
} from '@/features/labor'

export type OrgSaburokuFinding = {
  userId: string
  userName: string
  userEmail: string
  finding: SaburokuYearFinding
  severity: 'violation' | 'warning' | 'clean'
}

export type OrgSaburokuResponse = {
  asOfYearMonth: string
  windowStartYearMonth: string
  members: OrgSaburokuFinding[]
}

function addMonths(yearMonth: string, delta: number): string {
  const [y, m] = yearMonth.split('-').map(Number)
  const total = (y as number) * 12 + ((m as number) - 1) + delta
  const ny = Math.floor(total / 12)
  const nm = (total % 12) + 1
  return `${ny}-${String(nm).padStart(2, '0')}`
}

function firstDayOf(yearMonth: string): string {
  return `${yearMonth}-01`
}

function lastDayOf(yearMonth: string): string {
  const [y, m] = yearMonth.split('-').map(Number)
  const last = new Date(Date.UTC(y as number, m as number, 0)).getUTCDate()
  return `${yearMonth}-${String(last).padStart(2, '0')}`
}

function classifySeverity(f: SaburokuYearFinding): OrgSaburokuFinding['severity'] {
  if (
    f.exceedsAnnual360h ||
    f.exceedsAnnual720h ||
    f.exceedsSpecialClauseInvocationLimit ||
    f.exceedsRollingAverage80h ||
    f.monthlyFindings.some((m) => m.exceedsMonthly100h)
  ) {
    return 'violation'
  }
  if (f.monthlyFindings.some((m) => m.exceedsMonthly45h)) {
    return 'warning'
  }
  return 'clean'
}

export async function getOrgSaburokuFindingsHandler(
  ctx: ApiCallerContext,
  asOfYearMonth: string,
): Promise<OrgSaburokuResponse> {
  // 12 ヶ月ウィンドウ: asOf を含み 11 ヶ月前まで
  const windowStart = addMonths(asOfYearMonth, -11)
  const fromDate = firstDayOf(windowStart)
  const toDate = lastDayOf(asOfYearMonth)
  const fallbackEnd = new Date()
  const policy = { legalHolidayDow: ctx.organization.legalHolidayDow }

  const memberRows = await db
    .select({ m: memberships, u: users })
    .from(memberships)
    .innerJoin(users, eq(users.id, memberships.userId))
    .where(eq(memberships.organizationId, ctx.organization.id))

  const userIds = memberRows.map((r) => r.u.id)
  if (userIds.length === 0) {
    return { asOfYearMonth, windowStartYearMonth: windowStart, members: [] }
  }

  const entryRows = await db
    .select()
    .from(timeEntries)
    .where(
      and(
        eq(timeEntries.organizationId, ctx.organization.id),
        inArray(timeEntries.userId, userIds),
        gte(timeEntries.workDate, fromDate),
        lte(timeEntries.workDate, toDate),
      ),
    )
  const entryIds = entryRows.map((e) => e.id)
  const breakRows =
    entryIds.length > 0
      ? await db
          .select()
          .from(breaks)
          .where(inArray(breaks.timeEntryId, entryIds))
      : []
  const breakSegmentsByEntry = new Map<string, BreakSegment[]>()
  for (const b of breakRows) {
    const arr = breakSegmentsByEntry.get(b.timeEntryId) ?? []
    arr.push({ startAt: b.startAt, endAt: b.endAt })
    breakSegmentsByEntry.set(b.timeEntryId, arr)
  }

  // user × yearMonth ごとに DayInput を集約
  const dayInputsByKey = new Map<string, DayInput[]>()
  const k = (uid: string, ym: string) => `${uid}::${ym}`
  for (const e of entryRows) {
    if (!e.clockInAt) continue
    const ym = e.workDate.slice(0, 7)
    const key = k(e.userId, ym)
    const arr = dayInputsByKey.get(key) ?? []
    arr.push({
      workDate: e.workDate,
      workSegments: deriveWorkSegments(
        { clockInAt: e.clockInAt, clockOutAt: e.clockOutAt },
        breakSegmentsByEntry.get(e.id) ?? [],
        fallbackEnd,
      ),
      isLegalHoliday: isLegalHoliday(
        new Date(`${e.workDate}T00:00:00+09:00`),
        policy,
      ),
    })
    dayInputsByKey.set(key, arr)
  }

  // 各 user について 12 ヶ月分の SaburokuMonthInput を作って assess
  const months: string[] = []
  for (let i = 0; i < 12; i++) months.push(addMonths(windowStart, i))

  const findings: OrgSaburokuFinding[] = memberRows.map((r) => {
    // 管理監督者 (manager) は労基法 41 条 2 号により労働時間規定の適用除外
    // → 36 協定の対象外。breakdown を呼ぶ意味もないので空配列を返し severity='clean'
    const userMonths: SaburokuMonthInput[] = months.map((ym) => {
      const days = dayInputsByKey.get(k(r.u.id, ym)) ?? []
      const breakdown = computeMonthlyBreakdown(days, r.m.laborCategory)
      return {
        yearMonth: ym,
        legalOvertimeMinutes: breakdown.totalLegalOvertimeMinutes,
        legalHolidayWorkedMinutes: breakdown.legalHolidayWorkedMinutes,
      }
    })
    const finding = assessSaburokuYear(userMonths)
    return {
      userId: r.u.id,
      userName: r.u.name,
      userEmail: r.u.email,
      finding,
      severity: classifySeverity(finding),
    }
  })

  return {
    asOfYearMonth,
    windowStartYearMonth: windowStart,
    members: findings,
  }
}
