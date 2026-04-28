import { and, asc, between, eq, inArray, isNull } from 'drizzle-orm'
import { db } from '@/shared/lib/db.server'
import {
  breaks,
  monthlyLocks,
  timeEntries,
  type Break as BreakRow,
  type TimeEntry as TimeEntryRow,
} from '@/db/schema'
import type { ApiCallerContext } from '@/shared/server/apiAuth'
import { today } from '@/shared/lib/datetime'
import type {
  BreakInterval,
  DailyTotal,
  TimeEntry,
  TodayStatus,
} from '../types'

function toTimeEntryDTO(entry: TimeEntryRow, breakRows: BreakRow[]): TimeEntry {
  return {
    id: entry.id,
    workDate: entry.workDate,
    clockInAt: entry.clockInAt ? entry.clockInAt.toISOString() : null,
    clockOutAt: entry.clockOutAt ? entry.clockOutAt.toISOString() : null,
    status: entry.status,
    breaks: breakRows
      .filter((b) => b.timeEntryId === entry.id)
      .map<BreakInterval>((b) => ({
        id: b.id,
        startAt: b.startAt.toISOString(),
        endAt: b.endAt ? b.endAt.toISOString() : null,
      }))
      .sort((a, b) => a.startAt.localeCompare(b.startAt)),
  }
}

function diffMinutes(start: Date, end: Date | null): number {
  const e = end ?? new Date()
  return Math.max(0, Math.round((e.getTime() - start.getTime()) / 60_000))
}

function computeMinutes(entry: TimeEntryRow, breakRows: BreakRow[]) {
  if (!entry.clockInAt) return { workingMinutes: 0, breakMinutes: 0 }
  const total = diffMinutes(entry.clockInAt, entry.clockOutAt)
  const breakSum = breakRows
    .filter((b) => b.timeEntryId === entry.id)
    .reduce((sum, b) => sum + diffMinutes(b.startAt, b.endAt), 0)
  return {
    workingMinutes: Math.max(0, total - breakSum),
    breakMinutes: breakSum,
  }
}

async function ensureNotLocked(
  ctx: ApiCallerContext,
  workDate: string,
): Promise<void> {
  const yearMonth = workDate.slice(0, 7)
  const rows = await db
    .select()
    .from(monthlyLocks)
    .where(
      and(
        eq(monthlyLocks.organizationId, ctx.organization.id),
        eq(monthlyLocks.yearMonth, yearMonth),
      ),
    )
    .limit(1)
  if (rows.length > 0) {
    const e = new Error('MONTH_LOCKED')
    ;(e as { code?: string }).code = 'MONTH_LOCKED'
    throw e
  }
}

async function getOrCreateTodayEntry(ctx: ApiCallerContext): Promise<TimeEntryRow> {
  const date = today()
  const existing = await db
    .select()
    .from(timeEntries)
    .where(
      and(eq(timeEntries.userId, ctx.user.id), eq(timeEntries.workDate, date)),
    )
    .limit(1)
  if (existing[0]) return existing[0]
  const [created] = await db
    .insert(timeEntries)
    .values({
      organizationId: ctx.organization.id,
      userId: ctx.user.id,
      workDate: date,
      status: 'not_started',
    })
    .returning()
  if (!created) throw new Error('time_entry insert failed')
  return created
}

function invalidStateError(): Error {
  const e = new Error('INVALID_STATE_TRANSITION')
  ;(e as { code?: string }).code = 'INVALID_STATE_TRANSITION'
  return e
}

// ----- mutations (打刻) -----

export async function clockInHandler(ctx: ApiCallerContext): Promise<TimeEntry> {
  const entry = await getOrCreateTodayEntry(ctx)
  await ensureNotLocked(ctx, entry.workDate)
  if (entry.status !== 'not_started') throw invalidStateError()
  const now = new Date()
  const [updated] = await db
    .update(timeEntries)
    .set({ status: 'working', clockInAt: now, updatedAt: now })
    .where(eq(timeEntries.id, entry.id))
    .returning()
  if (!updated) throw new Error('clock_in update failed')
  return toTimeEntryDTO(updated, [])
}

export async function clockOutHandler(ctx: ApiCallerContext): Promise<TimeEntry> {
  const entry = await getOrCreateTodayEntry(ctx)
  await ensureNotLocked(ctx, entry.workDate)
  if (entry.status !== 'working') throw invalidStateError()
  const now = new Date()
  const [updated] = await db
    .update(timeEntries)
    .set({ status: 'finished', clockOutAt: now, updatedAt: now })
    .where(eq(timeEntries.id, entry.id))
    .returning()
  if (!updated) throw new Error('clock_out update failed')
  const breakRows = await db
    .select()
    .from(breaks)
    .where(eq(breaks.timeEntryId, entry.id))
  return toTimeEntryDTO(updated, breakRows)
}

export async function breakStartHandler(ctx: ApiCallerContext): Promise<TimeEntry> {
  const entry = await getOrCreateTodayEntry(ctx)
  await ensureNotLocked(ctx, entry.workDate)
  if (entry.status !== 'working') throw invalidStateError()
  const now = new Date()
  await db.transaction(async (tx) => {
    await tx.insert(breaks).values({ timeEntryId: entry.id, startAt: now })
    await tx
      .update(timeEntries)
      .set({ status: 'on_break', updatedAt: now })
      .where(eq(timeEntries.id, entry.id))
  })
  const [updated] = await db
    .select()
    .from(timeEntries)
    .where(eq(timeEntries.id, entry.id))
  const breakRows = await db
    .select()
    .from(breaks)
    .where(eq(breaks.timeEntryId, entry.id))
  if (!updated) throw new Error('time_entry not found')
  return toTimeEntryDTO(updated, breakRows)
}

export async function breakEndHandler(ctx: ApiCallerContext): Promise<TimeEntry> {
  const entry = await getOrCreateTodayEntry(ctx)
  await ensureNotLocked(ctx, entry.workDate)
  if (entry.status !== 'on_break') throw invalidStateError()
  const now = new Date()
  // 開始済みで未終了の break を見つけて閉じる
  const open = await db
    .select()
    .from(breaks)
    .where(and(eq(breaks.timeEntryId, entry.id), isNull(breaks.endAt)))
    .limit(1)
  const openBreak = open[0]
  if (!openBreak) throw invalidStateError()
  await db.transaction(async (tx) => {
    await tx.update(breaks).set({ endAt: now }).where(eq(breaks.id, openBreak.id))
    await tx
      .update(timeEntries)
      .set({ status: 'working', updatedAt: now })
      .where(eq(timeEntries.id, entry.id))
  })
  const [updated] = await db
    .select()
    .from(timeEntries)
    .where(eq(timeEntries.id, entry.id))
  const breakRows = await db
    .select()
    .from(breaks)
    .where(eq(breaks.timeEntryId, entry.id))
  if (!updated) throw new Error('time_entry not found')
  return toTimeEntryDTO(updated, breakRows)
}

// ----- queries -----

export async function getTodayStatusHandler(
  ctx: ApiCallerContext,
): Promise<TodayStatus> {
  const date = today()
  const rows = await db
    .select()
    .from(timeEntries)
    .where(
      and(eq(timeEntries.userId, ctx.user.id), eq(timeEntries.workDate, date)),
    )
    .limit(1)
  const entry = rows[0]
  if (!entry) {
    return { date, entry: null, workingMinutes: 0, breakMinutes: 0 }
  }
  const breakRows = await db
    .select()
    .from(breaks)
    .where(eq(breaks.timeEntryId, entry.id))
  const minutes = computeMinutes(entry, breakRows)
  return {
    date,
    entry: toTimeEntryDTO(entry, breakRows),
    ...minutes,
  }
}

export async function listAttendanceHandler(
  organizationId: string,
  userId: string,
  yearMonth: string,
): Promise<DailyTotal[]> {
  const monthStart = `${yearMonth}-01`
  const next = nextMonthFirstDay(yearMonth)
  const entryRows = await db
    .select()
    .from(timeEntries)
    .where(
      and(
        eq(timeEntries.organizationId, organizationId),
        eq(timeEntries.userId, userId),
        between(timeEntries.workDate, monthStart, next),
      ),
    )
    .orderBy(asc(timeEntries.workDate))
  if (entryRows.length === 0) return []
  const ids = entryRows.map((e) => e.id)
  const breakRows = await db
    .select()
    .from(breaks)
    .where(inArray(breaks.timeEntryId, ids))
  return entryRows
    .filter((e) => e.workDate.slice(0, 7) === yearMonth)
    .map((e) => {
      const m = computeMinutes(e, breakRows)
      return {
        workDate: e.workDate,
        status: e.status,
        clockInAt: e.clockInAt ? e.clockInAt.toISOString() : null,
        clockOutAt: e.clockOutAt ? e.clockOutAt.toISOString() : null,
        ...m,
      }
    })
}

function nextMonthFirstDay(yearMonth: string): string {
  const [y, m] = yearMonth.split('-').map((s) => Number(s))
  const ym = (y as number) * 12 + ((m as number) - 1) + 1
  const ny = Math.floor(ym / 12)
  const nm = (ym % 12) + 1
  return `${ny}-${String(nm).padStart(2, '0')}-01`
}

export async function getAttendanceDetailHandler(
  ctx: ApiCallerContext,
  userId: string,
  workDate: string,
): Promise<{ entry: TimeEntry | null }> {
  const rows = await db
    .select()
    .from(timeEntries)
    .where(
      and(
        eq(timeEntries.organizationId, ctx.organization.id),
        eq(timeEntries.userId, userId),
        eq(timeEntries.workDate, workDate),
      ),
    )
    .limit(1)
  const entry = rows[0]
  if (!entry) return { entry: null }
  const breakRows = await db
    .select()
    .from(breaks)
    .where(eq(breaks.timeEntryId, entry.id))
  return { entry: toTimeEntryDTO(entry, breakRows) }
}
