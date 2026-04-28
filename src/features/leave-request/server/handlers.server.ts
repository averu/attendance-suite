import { and, desc, eq } from 'drizzle-orm'
import { db } from '@/shared/lib/db.server'
import {
  leaveRequestReviews,
  leaveRequests,
  users,
} from '@/db/schema'
import type { ApiCallerContext } from '@/shared/server/apiAuth'
import type { LeaveRequestDTO, LeaveStatus, LeaveType } from '../types'
import type {
  CancelLeaveRequestInput,
  CreateLeaveRequestInput,
  ReviewLeaveRequestInput,
} from '../schemas'

function err(code: string): Error {
  const e = new Error(code)
  ;(e as { code?: string }).code = code
  return e
}

function toDTO(row: {
  r: typeof leaveRequests.$inferSelect
  u: typeof users.$inferSelect
}): LeaveRequestDTO {
  return {
    id: row.r.id,
    requesterUserId: row.r.requesterUserId,
    requesterName: row.u.name,
    leaveType: row.r.leaveType as LeaveType,
    startDate: row.r.startDate,
    endDate: row.r.endDate,
    reason: row.r.reason,
    status: row.r.status as LeaveStatus,
    createdAt: row.r.createdAt.toISOString(),
  }
}

export async function createLeaveRequestHandler(
  ctx: ApiCallerContext,
  input: CreateLeaveRequestInput,
): Promise<{ id: string }> {
  const [row] = await db
    .insert(leaveRequests)
    .values({
      organizationId: ctx.organization.id,
      requesterUserId: ctx.user.id,
      leaveType: input.leaveType,
      startDate: input.startDate,
      endDate: input.endDate,
      reason: input.reason,
      status: 'pending',
    })
    .returning()
  if (!row) throw new Error('insert failed')
  return { id: row.id }
}

export async function listMyLeaveRequestsHandler(
  ctx: ApiCallerContext,
): Promise<LeaveRequestDTO[]> {
  const rows = await db
    .select({ r: leaveRequests, u: users })
    .from(leaveRequests)
    .innerJoin(users, eq(users.id, leaveRequests.requesterUserId))
    .where(
      and(
        eq(leaveRequests.organizationId, ctx.organization.id),
        eq(leaveRequests.requesterUserId, ctx.user.id),
      ),
    )
    .orderBy(desc(leaveRequests.createdAt))
  return rows.map(toDTO)
}

export async function listOrgLeaveRequestsHandler(
  ctx: ApiCallerContext,
  filter: { status?: string; userId?: string } = {},
): Promise<LeaveRequestDTO[]> {
  const conditions = [eq(leaveRequests.organizationId, ctx.organization.id)]
  if (filter.status) {
    conditions.push(eq(leaveRequests.status, filter.status as 'pending'))
  }
  if (filter.userId) {
    conditions.push(eq(leaveRequests.requesterUserId, filter.userId))
  }
  const rows = await db
    .select({ r: leaveRequests, u: users })
    .from(leaveRequests)
    .innerJoin(users, eq(users.id, leaveRequests.requesterUserId))
    .where(and(...conditions))
    .orderBy(desc(leaveRequests.createdAt))
  return rows.map(toDTO)
}

export async function cancelLeaveRequestHandler(
  ctx: ApiCallerContext,
  input: CancelLeaveRequestInput,
): Promise<{ ok: true }> {
  const [row] = await db
    .select()
    .from(leaveRequests)
    .where(eq(leaveRequests.id, input.requestId))
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
    .update(leaveRequests)
    .set({ status: 'cancelled', updatedAt: new Date() })
    .where(eq(leaveRequests.id, input.requestId))
  return { ok: true }
}

export async function approveLeaveRequestHandler(
  ctx: ApiCallerContext,
  input: ReviewLeaveRequestInput,
): Promise<{ ok: true }> {
  const [row] = await db
    .select()
    .from(leaveRequests)
    .where(eq(leaveRequests.id, input.requestId))
    .limit(1)
  if (!row || row.organizationId !== ctx.organization.id) throw err('NOT_FOUND')
  if (row.status !== 'pending') throw err('NOT_PENDING')

  await db.transaction(async (tx) => {
    await tx.insert(leaveRequestReviews).values({
      leaveRequestId: row.id,
      reviewerUserId: ctx.user.id,
      decision: 'approved',
      comment: input.comment ?? null,
    })
    await tx
      .update(leaveRequests)
      .set({ status: 'approved', updatedAt: new Date() })
      .where(eq(leaveRequests.id, row.id))
  })
  return { ok: true }
}

export async function rejectLeaveRequestHandler(
  ctx: ApiCallerContext,
  input: ReviewLeaveRequestInput,
): Promise<{ ok: true }> {
  const [row] = await db
    .select()
    .from(leaveRequests)
    .where(eq(leaveRequests.id, input.requestId))
    .limit(1)
  if (!row || row.organizationId !== ctx.organization.id) throw err('NOT_FOUND')
  if (row.status !== 'pending') throw err('NOT_PENDING')

  await db.transaction(async (tx) => {
    await tx.insert(leaveRequestReviews).values({
      leaveRequestId: row.id,
      reviewerUserId: ctx.user.id,
      decision: 'rejected',
      comment: input.comment ?? null,
    })
    await tx
      .update(leaveRequests)
      .set({ status: 'rejected', updatedAt: new Date() })
      .where(eq(leaveRequests.id, row.id))
  })
  return { ok: true }
}
