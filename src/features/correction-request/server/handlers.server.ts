import { and, desc, eq } from 'drizzle-orm'
import { db } from '@/shared/lib/db.server'
import {
  breaks,
  correctionRequestReviews,
  correctionRequests,
  monthlyLocks,
  timeEntries,
  users,
} from '@/db/schema'
import type { ApiCallerContext } from '@/shared/server/apiAuth'
import type { CorrectionRequestDTO } from '../types'
import type {
  CancelCorrectionRequestInput,
  CreateCorrectionRequestInput,
  ReviewCorrectionRequestInput,
} from '../schemas'

function err(code: string): Error {
  const e = new Error(code)
  ;(e as { code?: string }).code = code
  return e
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
  if (rows.length > 0) throw err('MONTH_LOCKED')
}

export async function createCorrectionRequestHandler(
  ctx: ApiCallerContext,
  input: CreateCorrectionRequestInput,
): Promise<{ id: string }> {
  await ensureNotLocked(ctx, input.targetDate)
  const isDelete = input.requestType === 'delete'
  const [row] = await db
    .insert(correctionRequests)
    .values({
      organizationId: ctx.organization.id,
      requesterUserId: ctx.user.id,
      targetDate: input.targetDate,
      requestType: input.requestType,
      // delete 申請は提案値を持たない (UI でも入力させない)
      proposedClockInAt:
        !isDelete && input.proposedClockInAt
          ? new Date(input.proposedClockInAt)
          : null,
      proposedClockOutAt:
        !isDelete && input.proposedClockOutAt
          ? new Date(input.proposedClockOutAt)
          : null,
      proposedBreaks: isDelete ? null : input.proposedBreaks ?? null,
      reason: input.reason,
      status: 'pending',
    })
    .returning()
  if (!row) throw new Error('insert failed')
  return { id: row.id }
}

export async function listMyCorrectionRequestsHandler(
  ctx: ApiCallerContext,
): Promise<CorrectionRequestDTO[]> {
  const rows = await db
    .select({
      r: correctionRequests,
      u: users,
    })
    .from(correctionRequests)
    .innerJoin(users, eq(users.id, correctionRequests.requesterUserId))
    .where(
      and(
        eq(correctionRequests.organizationId, ctx.organization.id),
        eq(correctionRequests.requesterUserId, ctx.user.id),
      ),
    )
    .orderBy(desc(correctionRequests.createdAt))
  return rows.map(toDTO)
}

export async function listOrgCorrectionRequestsHandler(
  ctx: ApiCallerContext,
  filter: { status?: string; userId?: string } = {},
): Promise<CorrectionRequestDTO[]> {
  const conditions = [
    eq(correctionRequests.organizationId, ctx.organization.id),
  ]
  if (filter.status) {
    conditions.push(
      eq(correctionRequests.status, filter.status as 'pending'),
    )
  }
  if (filter.userId) {
    conditions.push(eq(correctionRequests.requesterUserId, filter.userId))
  }
  const rows = await db
    .select({ r: correctionRequests, u: users })
    .from(correctionRequests)
    .innerJoin(users, eq(users.id, correctionRequests.requesterUserId))
    .where(and(...conditions))
    .orderBy(desc(correctionRequests.createdAt))
  return rows.map(toDTO)
}

function toDTO(row: {
  r: typeof correctionRequests.$inferSelect
  u: typeof users.$inferSelect
}): CorrectionRequestDTO {
  return {
    id: row.r.id,
    requesterUserId: row.r.requesterUserId,
    requesterName: row.u.name,
    targetDate: row.r.targetDate,
    requestType: row.r.requestType,
    proposedClockInAt: row.r.proposedClockInAt
      ? row.r.proposedClockInAt.toISOString()
      : null,
    proposedClockOutAt: row.r.proposedClockOutAt
      ? row.r.proposedClockOutAt.toISOString()
      : null,
    proposedBreaks: row.r.proposedBreaks ?? null,
    reason: row.r.reason,
    status: row.r.status,
    createdAt: row.r.createdAt.toISOString(),
    reviewerName: null,
    reviewedAt: null,
    reviewComment: null,
  }
}

export async function cancelCorrectionRequestHandler(
  ctx: ApiCallerContext,
  input: CancelCorrectionRequestInput,
): Promise<{ ok: true }> {
  const [row] = await db
    .select()
    .from(correctionRequests)
    .where(eq(correctionRequests.id, input.requestId))
    .limit(1)
  if (
    !row ||
    row.organizationId !== ctx.organization.id ||
    row.requesterUserId !== ctx.user.id
  ) {
    throw err('NOT_FOUND')
  }
  if (row.status !== 'pending') throw err('NOT_PENDING')
  await db
    .update(correctionRequests)
    .set({ status: 'cancelled', updatedAt: new Date() })
    .where(eq(correctionRequests.id, input.requestId))
  return { ok: true }
}

async function applyApprovedRequest(
  organizationId: string,
  requesterUserId: string,
  request: typeof correctionRequests.$inferSelect,
): Promise<void> {
  await db.transaction(async (tx) => {
    // delete 申請: 該当 time_entry を削除 (FK CASCADE で breaks も消える)。
    // 既に entry が無ければ no-op (誤申請でも害はない)。
    if (request.requestType === 'delete') {
      await tx
        .delete(timeEntries)
        .where(
          and(
            eq(timeEntries.userId, requesterUserId),
            eq(timeEntries.workDate, request.targetDate),
          ),
        )
      return
    }

    // edit 申請: 既存 entry を find or insert
    const existing = await tx
      .select()
      .from(timeEntries)
      .where(
        and(
          eq(timeEntries.userId, requesterUserId),
          eq(timeEntries.workDate, request.targetDate),
        ),
      )
      .limit(1)
    let entryId: string
    if (existing[0]) {
      entryId = existing[0].id
      await tx
        .update(timeEntries)
        .set({
          clockInAt: request.proposedClockInAt ?? existing[0].clockInAt,
          clockOutAt: request.proposedClockOutAt ?? existing[0].clockOutAt,
          status: request.proposedClockOutAt ? 'finished' : existing[0].status,
          updatedAt: new Date(),
        })
        .where(eq(timeEntries.id, entryId))
    } else {
      const [created] = await tx
        .insert(timeEntries)
        .values({
          organizationId,
          userId: requesterUserId,
          workDate: request.targetDate,
          clockInAt: request.proposedClockInAt,
          clockOutAt: request.proposedClockOutAt,
          status: request.proposedClockOutAt
            ? 'finished'
            : request.proposedClockInAt
              ? 'working'
              : 'not_started',
        })
        .returning()
      if (!created) throw new Error('time_entry insert failed')
      entryId = created.id
    }
    // 提案された breaks で置き換え
    if (request.proposedBreaks) {
      await tx.delete(breaks).where(eq(breaks.timeEntryId, entryId))
      for (const b of request.proposedBreaks) {
        await tx.insert(breaks).values({
          timeEntryId: entryId,
          startAt: new Date(b.startAt),
          endAt: b.endAt ? new Date(b.endAt) : null,
        })
      }
    }
  })
}

export async function approveCorrectionRequestHandler(
  ctx: ApiCallerContext,
  input: ReviewCorrectionRequestInput,
): Promise<{ ok: true }> {
  const [row] = await db
    .select()
    .from(correctionRequests)
    .where(eq(correctionRequests.id, input.requestId))
    .limit(1)
  if (!row || row.organizationId !== ctx.organization.id) throw err('NOT_FOUND')
  if (row.status !== 'pending') throw err('NOT_PENDING')
  await ensureNotLocked(ctx, row.targetDate)

  await applyApprovedRequest(row.organizationId, row.requesterUserId, row)

  await db.transaction(async (tx) => {
    await tx.insert(correctionRequestReviews).values({
      correctionRequestId: row.id,
      reviewerUserId: ctx.user.id,
      decision: 'approved',
      comment: input.comment ?? null,
    })
    await tx
      .update(correctionRequests)
      .set({ status: 'approved', updatedAt: new Date() })
      .where(eq(correctionRequests.id, row.id))
  })
  return { ok: true }
}

export async function rejectCorrectionRequestHandler(
  ctx: ApiCallerContext,
  input: ReviewCorrectionRequestInput,
): Promise<{ ok: true }> {
  const [row] = await db
    .select()
    .from(correctionRequests)
    .where(eq(correctionRequests.id, input.requestId))
    .limit(1)
  if (!row || row.organizationId !== ctx.organization.id) throw err('NOT_FOUND')
  if (row.status !== 'pending') throw err('NOT_PENDING')

  await db.transaction(async (tx) => {
    await tx.insert(correctionRequestReviews).values({
      correctionRequestId: row.id,
      reviewerUserId: ctx.user.id,
      decision: 'rejected',
      comment: input.comment ?? null,
    })
    await tx
      .update(correctionRequests)
      .set({ status: 'rejected', updatedAt: new Date() })
      .where(eq(correctionRequests.id, row.id))
  })
  return { ok: true }
}
