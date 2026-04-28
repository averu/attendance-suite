import { and, asc, between, desc, eq, gte, inArray, isNull, lt } from 'drizzle-orm'
import { db } from '@/shared/lib/db.server'
import {
  attendanceAudits,
  breaks,
  memberships,
  monthlyLocks,
  timeEntries,
  users,
  type Break as BreakRow,
  type TimeEntry as TimeEntryRow,
} from '@/db/schema'
import type { ApiCallerContext } from '@/shared/server/apiAuth'
import { today } from '@/shared/lib/datetime'
import type {
  AuditLogEntry,
  AuditSnapshot,
  BreakInterval,
  DailyTotal,
  OpenReminder,
  TimeEntry,
  TimeEntryStatus,
  TodayStatus,
} from '../types'
import type { EditAttendanceEntryInput } from '../schemas'

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

// ----- 直接編集 (admin+ 限定) -----

function deriveStatus(
  clockInAt: string | null,
  clockOutAt: string | null,
): TimeEntryStatus {
  if (clockOutAt) return 'finished'
  if (clockInAt) return 'working'
  return 'not_started'
}

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0]

async function snapshotEntry(tx: Tx, entry: TimeEntryRow): Promise<{
  entry: ReturnType<typeof toTimeEntryDTO>
}> {
  const breakRows = await tx
    .select()
    .from(breaks)
    .where(eq(breaks.timeEntryId, entry.id))
  return { entry: toTimeEntryDTO(entry, breakRows) }
}

export async function editAttendanceEntryHandler(
  ctx: ApiCallerContext,
  input: EditAttendanceEntryInput,
): Promise<{ entry: TimeEntry }> {
  // 1) 対象 user が同じ組織か検証 (cross-org 攻撃防止)
  const targetRows = await db
    .select()
    .from(memberships)
    .where(
      and(
        eq(memberships.userId, input.userId),
        eq(memberships.organizationId, ctx.organization.id),
      ),
    )
    .limit(1)
  if (!targetRows[0]) {
    const e = new Error('TARGET_NOT_FOUND')
    ;(e as { code?: string }).code = 'TARGET_NOT_FOUND'
    throw e
  }

  // 2) 月次締めロック中は編集不可
  await ensureNotLocked(ctx, input.workDate)

  // 3) 休憩区間は出勤〜退勤の枠内かチェック
  if (input.clockInAt) {
    const inMs = new Date(input.clockInAt).getTime()
    const outMs = input.clockOutAt
      ? new Date(input.clockOutAt).getTime()
      : Number.POSITIVE_INFINITY
    for (const b of input.breaks) {
      const bs = new Date(b.startAt).getTime()
      const be = new Date(b.endAt).getTime()
      if (bs < inMs || be > outMs || bs >= be) {
        const e = new Error('INVALID_BREAK_RANGE')
        ;(e as { code?: string }).code = 'INVALID_BREAK_RANGE'
        throw e
      }
    }
  } else if (input.breaks.length > 0) {
    const e = new Error('BREAK_REQUIRES_CLOCK_IN')
    ;(e as { code?: string }).code = 'BREAK_REQUIRES_CLOCK_IN'
    throw e
  }

  // 4) upsert + breaks 全置換 + 監査ログ書き込み (transaction)
  const status = deriveStatus(input.clockInAt, input.clockOutAt)
  const entryId = await db.transaction(async (tx) => {
    const existing = await tx
      .select()
      .from(timeEntries)
      .where(
        and(
          eq(timeEntries.userId, input.userId),
          eq(timeEntries.workDate, input.workDate),
        ),
      )
      .limit(1)
    // 編集前の snapshot を取る (監査ログ用)
    const beforeSnapshot = existing[0]
      ? await snapshotEntry(tx, existing[0])
      : null

    let afterEntry: TimeEntryRow
    let action: 'edit' | 'create'
    if (existing[0]) {
      action = 'edit'
      const [updated] = await tx
        .update(timeEntries)
        .set({
          clockInAt: input.clockInAt ? new Date(input.clockInAt) : null,
          clockOutAt: input.clockOutAt ? new Date(input.clockOutAt) : null,
          status,
          noteForUser: input.note ?? existing[0].noteForUser,
          updatedAt: new Date(),
        })
        .where(eq(timeEntries.id, existing[0].id))
        .returning()
      if (!updated) throw new Error('time_entry update failed')
      afterEntry = updated
    } else {
      action = 'create'
      const [created] = await tx
        .insert(timeEntries)
        .values({
          organizationId: ctx.organization.id,
          userId: input.userId,
          workDate: input.workDate,
          clockInAt: input.clockInAt ? new Date(input.clockInAt) : null,
          clockOutAt: input.clockOutAt ? new Date(input.clockOutAt) : null,
          status,
          noteForUser: input.note ?? null,
        })
        .returning()
      if (!created) throw new Error('time_entry insert failed')
      afterEntry = created
    }
    const id = afterEntry.id
    // breaks 全置換
    await tx.delete(breaks).where(eq(breaks.timeEntryId, id))
    for (const b of input.breaks) {
      await tx.insert(breaks).values({
        timeEntryId: id,
        startAt: new Date(b.startAt),
        endAt: new Date(b.endAt),
      })
    }

    // 編集後の snapshot (再 SELECT 不要、afterEntry は最新の time_entry。breaks は再 fetch)
    const afterSnapshot = await snapshotEntry(tx, afterEntry)
    await tx.insert(attendanceAudits).values({
      organizationId: ctx.organization.id,
      targetUserId: input.userId,
      workDate: input.workDate,
      actorUserId: ctx.user.id,
      action,
      beforeJson: beforeSnapshot,
      afterJson: afterSnapshot,
      note: input.note ?? null,
    })

    return id
  })

  // 5) 結果を返す
  const [updated] = await db
    .select()
    .from(timeEntries)
    .where(eq(timeEntries.id, entryId))
  if (!updated) throw new Error('time_entry not found after edit')
  const breakRows = await db
    .select()
    .from(breaks)
    .where(eq(breaks.timeEntryId, entryId))
  return { entry: toTimeEntryDTO(updated, breakRows) }
}

// ----- 監査ログ閲覧 (admin+ 限定) -----

export async function listAttendanceAuditsHandler(
  ctx: ApiCallerContext,
  userId: string,
  workDate: string,
): Promise<AuditLogEntry[]> {
  const rows = await db
    .select({ a: attendanceAudits, u: users })
    .from(attendanceAudits)
    .innerJoin(users, eq(users.id, attendanceAudits.actorUserId))
    .where(
      and(
        eq(attendanceAudits.organizationId, ctx.organization.id),
        eq(attendanceAudits.targetUserId, userId),
        eq(attendanceAudits.workDate, workDate),
      ),
    )
    .orderBy(desc(attendanceAudits.at))
  return rows.map((r) => ({
    id: r.a.id,
    workDate: r.a.workDate,
    action: r.a.action as 'edit' | 'create',
    actorUserId: r.a.actorUserId,
    actorName: r.u.name,
    before: r.a.beforeJson as AuditSnapshot | null,
    after: r.a.afterJson as AuditSnapshot | null,
    note: r.a.note,
    at: r.a.at.toISOString(),
  }))
}

// ----- 退勤忘れリマインダー -----

/**
 * 自分の過去 14 日 (今日含めず) で clock_out が無い entry を返す。
 * 「working / on_break のまま放置」「打刻忘れ」検知用。
 */
export async function listMyOpenRemindersHandler(
  ctx: ApiCallerContext,
): Promise<OpenReminder[]> {
  const todayStr = today()
  const fourteenDaysAgo = new Date(
    Date.UTC(
      Number(todayStr.slice(0, 4)),
      Number(todayStr.slice(5, 7)) - 1,
      Number(todayStr.slice(8, 10)) - 14,
    ),
  )
  const fromStr = fourteenDaysAgo.toISOString().slice(0, 10)

  // 今日は除外して取得 (退勤忘れ判定は前日以前のみ意味がある)
  const rows = await db
    .select()
    .from(timeEntries)
    .where(
      and(
        eq(timeEntries.organizationId, ctx.organization.id),
        eq(timeEntries.userId, ctx.user.id),
        gte(timeEntries.workDate, fromStr),
        lt(timeEntries.workDate, todayStr),
        isNull(timeEntries.clockOutAt),
      ),
    )
    .orderBy(asc(timeEntries.workDate))

  return rows
    .filter((r) => r.clockInAt !== null)
    .map((r) => ({
      workDate: r.workDate,
      clockInAt: (r.clockInAt as Date).toISOString(),
      status: r.status as TimeEntryStatus,
    }))
}
