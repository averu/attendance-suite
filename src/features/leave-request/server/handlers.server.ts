import { and, desc, eq, inArray } from 'drizzle-orm'
import { db } from '@/shared/lib/db.server'
import {
  leaveRequestReviews,
  leaveRequests,
  memberships,
  users,
} from '@/db/schema'
import type { ApiCallerContext } from '@/shared/server/apiAuth'
import type { LeaveRequestDTO, LeaveStatus, LeaveType } from '../types'
import type {
  CancelLeaveRequestInput,
  CreateLeaveRequestInput,
  ReviewLeaveRequestInput,
} from '../schemas'
import {
  checkAnnualPaidLeaveObligation,
  computeLeaveBalance,
  computePaidLeaveGrants,
} from '@/features/labor'
import type {
  AnnualObligationFinding,
  GrantBalanceSlice,
  LeaveUsage,
} from '@/features/labor'

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

export type OrgPaidLeaveObligationFinding = {
  userId: string
  userName: string
  userEmail: string
  /** 雇入未設定で算定不能の場合 true */
  isUnconfigured: boolean
  /** 各 grant 期間の judgment (10 日以上付与のみ) */
  obligations: AnnualObligationFinding[]
  /** violation (期間終了して未達) の grant 期間数 */
  violationCount: number
  /** pending (進行中で未達) の grant 期間数 */
  pendingCount: number
}

/**
 * org 全メンバーの「年 5 日取得義務」状況を返す。owner / admin 用。
 * 各メンバーの hireDate/weekly が未設定なら isUnconfigured で skip 表示。
 * 取得は status='approved' の paid_full / paid_half_* を集計。
 */
export async function getOrgPaidLeaveObligationsHandler(
  ctx: ApiCallerContext,
  asOfDate: string,
): Promise<OrgPaidLeaveObligationFinding[]> {
  const memberRows = await db
    .select({ m: memberships, u: users })
    .from(memberships)
    .innerJoin(users, eq(users.id, memberships.userId))
    .where(eq(memberships.organizationId, ctx.organization.id))

  const userIds = memberRows.map((r) => r.u.id)
  if (userIds.length === 0) return []

  const approved = await db
    .select()
    .from(leaveRequests)
    .where(
      and(
        eq(leaveRequests.organizationId, ctx.organization.id),
        inArray(leaveRequests.requesterUserId, userIds),
        eq(leaveRequests.status, 'approved'),
      ),
    )
  const usagesByUser = new Map<string, LeaveUsage[]>()
  for (const r of approved) {
    const arr = usagesByUser.get(r.requesterUserId) ?? []
    if (r.leaveType === 'paid_half_am' || r.leaveType === 'paid_half_pm') {
      arr.push({ date: r.startDate, days: 0.5 })
    } else if (r.leaveType === 'paid_full') {
      let cur = r.startDate
      while (cur.localeCompare(r.endDate) <= 0) {
        arr.push({ date: cur, days: 1 })
        cur = addOneDayYMD(cur)
      }
    }
    usagesByUser.set(r.requesterUserId, arr)
  }

  return memberRows.map((row) => {
    const m = row.m
    const u = row.u
    if (
      !m.hireDate ||
      m.weeklyScheduledDays == null ||
      m.weeklyScheduledHours == null
    ) {
      return {
        userId: u.id,
        userName: u.name,
        userEmail: u.email,
        isUnconfigured: true,
        obligations: [],
        violationCount: 0,
        pendingCount: 0,
      }
    }
    const grants = computePaidLeaveGrants(
      {
        hireDate: m.hireDate,
        weeklyScheduledDays: m.weeklyScheduledDays,
        weeklyScheduledHours: Number(m.weeklyScheduledHours),
      },
      asOfDate,
    )
    const usages = usagesByUser.get(u.id) ?? []
    const obligations = checkAnnualPaidLeaveObligation(grants, usages, asOfDate)
    return {
      userId: u.id,
      userName: u.name,
      userEmail: u.email,
      isUnconfigured: false,
      obligations,
      violationCount: obligations.filter((o) => o.status === 'violation').length,
      pendingCount: obligations.filter((o) => o.status === 'pending').length,
    }
  })
}

export type PaidLeaveBalanceResponse =
  | { status: 'UNCONFIGURED' }
  | {
      status: 'OK'
      asOfDate: string
      hireDate: string
      weeklyScheduledDays: number
      weeklyScheduledHours: number
      grants: GrantBalanceSlice[]
      totalGrantedActiveDays: number
      totalUsedDays: number
      remainingDays: number
      unallocatedUsedDays: number
      annualObligation: AnnualObligationFinding[]
    }

/**
 * 自分の有給残高を返す。
 * - membership に hireDate / weeklyScheduledDays / weeklyScheduledHours が未設定なら UNCONFIGURED
 * - 付与は computePaidLeaveGrants で都度算出 (出勤率は将来 attendance から導出。現状は 100% 仮定)
 * - 取得は status='approved' の paid_full / paid_half_am / paid_half_pm を集計
 *   - paid_full: startDate-endDate を 1 日刻みで展開 (各 1.0)
 *   - paid_half_*: 単日扱い (0.5)
 */
export async function getMyPaidLeaveBalanceHandler(
  ctx: ApiCallerContext,
  asOfDate: string,
): Promise<PaidLeaveBalanceResponse> {
  const [m] = await db
    .select()
    .from(memberships)
    .where(eq(memberships.id, ctx.membership.id))
    .limit(1)
  if (
    !m ||
    !m.hireDate ||
    m.weeklyScheduledDays == null ||
    m.weeklyScheduledHours == null
  ) {
    return { status: 'UNCONFIGURED' }
  }

  const grants = computePaidLeaveGrants(
    {
      hireDate: m.hireDate,
      weeklyScheduledDays: m.weeklyScheduledDays,
      weeklyScheduledHours: Number(m.weeklyScheduledHours),
    },
    asOfDate,
  )

  // 承認済 paid_* の usage を組み立てる
  const approved = await db
    .select()
    .from(leaveRequests)
    .where(
      and(
        eq(leaveRequests.organizationId, ctx.organization.id),
        eq(leaveRequests.requesterUserId, ctx.user.id),
        eq(leaveRequests.status, 'approved'),
      ),
    )

  const usages: LeaveUsage[] = []
  for (const r of approved) {
    if (r.leaveType === 'paid_half_am' || r.leaveType === 'paid_half_pm') {
      usages.push({ date: r.startDate, days: 0.5 })
    } else if (r.leaveType === 'paid_full') {
      // startDate ~ endDate を 1 日刻みに展開
      let cur = r.startDate
      while (cur.localeCompare(r.endDate) <= 0) {
        usages.push({ date: cur, days: 1 })
        cur = addOneDayYMD(cur)
      }
    }
  }

  const balance = computeLeaveBalance(grants, usages, asOfDate)
  const obligation = checkAnnualPaidLeaveObligation(grants, usages, asOfDate)
  return {
    status: 'OK',
    asOfDate,
    hireDate: m.hireDate,
    weeklyScheduledDays: m.weeklyScheduledDays,
    weeklyScheduledHours: Number(m.weeklyScheduledHours),
    grants: balance.grants,
    totalGrantedActiveDays: balance.totalGrantedActiveDays,
    totalUsedDays: balance.totalUsedDays,
    remainingDays: balance.remainingDays,
    unallocatedUsedDays: balance.unallocatedUsedDays,
    annualObligation: obligation,
  }
}

function addOneDayYMD(s: string): string {
  // YYYY-MM-DD を 1 日進める。月跨ぎ・年跨ぎを正規化。
  const [y, m, d] = s.split('-').map(Number)
  const dt = new Date(Date.UTC(y as number, (m as number) - 1, (d as number) + 1))
  const yy = dt.getUTCFullYear()
  const mm = String(dt.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(dt.getUTCDate()).padStart(2, '0')
  return `${yy}-${mm}-${dd}`
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
