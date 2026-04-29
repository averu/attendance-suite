import { and, desc, eq, inArray } from 'drizzle-orm'
import { db } from '@/shared/lib/db.server'
import {
  leaveGrants,
  leaveRequestReviews,
  leaveRequests,
  memberships,
  users,
} from '@/db/schema'
import type { ApiCallerContext } from '@/shared/server/apiAuth'
import type { LeaveRequestDTO, LeaveStatus, LeaveType } from '../types'
import type {
  AddLeaveGrantInput,
  CancelLeaveRequestInput,
  CreateLeaveRequestInput,
  RemoveLeaveGrantInput,
  ReviewLeaveRequestInput,
  SyncAutoLeaveGrantsInput,
} from '../schemas'
import {
  checkAnnualPaidLeaveObligation,
  computeLeaveBalance,
  computePaidLeaveGrants,
} from '@/features/labor'
import type {
  AnnualObligationFinding,
  GrantBalanceSlice,
  LeaveGrant,
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

  // 設定済メンバーは ensureAutoGrants で auto 付与を補完してから一括読み出し
  for (const row of memberRows) {
    const m = row.m
    if (
      m.hireDate &&
      m.weeklyScheduledDays != null &&
      m.weeklyScheduledHours != null
    ) {
      await ensureAutoGrants(
        ctx,
        m.userId,
        m.hireDate,
        m.weeklyScheduledDays,
        Number(m.weeklyScheduledHours),
        asOfDate,
      )
    }
  }
  const grantRows = await db
    .select()
    .from(leaveGrants)
    .where(
      and(
        eq(leaveGrants.organizationId, ctx.organization.id),
        inArray(leaveGrants.userId, userIds),
      ),
    )
  const grantsByUser = new Map<string, LeaveGrant[]>()
  for (const g of grantRows) {
    const arr = grantsByUser.get(g.userId) ?? []
    arr.push(rowToLaborGrant(g))
    grantsByUser.set(g.userId, arr)
  }

  return memberRows.map((row) => {
    const m = row.m
    const u = row.u
    const grants = grantsByUser.get(u.id) ?? []
    const isUnconfigured =
      (!m.hireDate ||
        m.weeklyScheduledDays == null ||
        m.weeklyScheduledHours == null) &&
      grants.length === 0
    if (isUnconfigured) {
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

// 雇入日から auto 付与日列を生成し、leave_grants に未登録の分だけ INSERT する。
// admin の手動付与 (source='manual') は触らない。重複は uniqueIndex で防止 + ここでも skip。
async function ensureAutoGrants(
  ctx: ApiCallerContext,
  userId: string,
  hireDate: string,
  weeklyDays: number,
  weeklyHours: number,
  asOfDate: string,
): Promise<void> {
  const computed = computePaidLeaveGrants(
    {
      hireDate,
      weeklyScheduledDays: weeklyDays,
      weeklyScheduledHours: weeklyHours,
    },
    asOfDate,
  )
  if (computed.length === 0) return
  const existing = await db
    .select({ grantDate: leaveGrants.grantDate })
    .from(leaveGrants)
    .where(
      and(
        eq(leaveGrants.organizationId, ctx.organization.id),
        eq(leaveGrants.userId, userId),
      ),
    )
  const existingDates = new Set(existing.map((e) => e.grantDate))
  const toInsert = computed.filter(
    (c) => !existingDates.has(c.grantDate) && c.grantedDays > 0,
  )
  if (toInsert.length === 0) return
  await db.insert(leaveGrants).values(
    toInsert.map((g) => ({
      organizationId: ctx.organization.id,
      userId,
      grantDate: g.grantDate,
      grantedDays: String(g.grantedDays),
      source: 'auto' as const,
      note: null,
      // auto 生成は誰の操作でもないので createdBy=null
      createdByUserId: null,
    })),
  )
}

// DB の leave_grants 1 行を labor の LeaveGrant 型に変換 (yearsOfService は表示専用)
function rowToLaborGrant(row: typeof leaveGrants.$inferSelect): LeaveGrant {
  return {
    grantDate: row.grantDate,
    yearsOfService: 0,
    grantedDays: Number(row.grantedDays),
    withheldFor80PctRule: false,
  }
}

export type AdminLeaveGrantDTO = {
  id: string
  userId: string
  grantDate: string
  grantedDays: number
  source: 'auto' | 'manual'
  note: string | null
  createdAt: string
}

export async function listMemberLeaveGrantsHandler(
  ctx: ApiCallerContext,
  userId: string,
): Promise<AdminLeaveGrantDTO[]> {
  const rows = await db
    .select()
    .from(leaveGrants)
    .where(
      and(
        eq(leaveGrants.organizationId, ctx.organization.id),
        eq(leaveGrants.userId, userId),
      ),
    )
    .orderBy(leaveGrants.grantDate)
  return rows.map((r) => ({
    id: r.id,
    userId: r.userId,
    grantDate: r.grantDate,
    grantedDays: Number(r.grantedDays),
    source: r.source,
    note: r.note,
    createdAt: r.createdAt.toISOString(),
  }))
}

export async function addLeaveGrantHandler(
  ctx: ApiCallerContext,
  input: AddLeaveGrantInput,
): Promise<{ id: string }> {
  // 同 org の membership があるか確認 (他組織のユーザーには付与できない)
  const [m] = await db
    .select()
    .from(memberships)
    .where(
      and(
        eq(memberships.organizationId, ctx.organization.id),
        eq(memberships.userId, input.userId),
      ),
    )
    .limit(1)
  if (!m) throw err('NOT_FOUND')
  try {
    const [row] = await db
      .insert(leaveGrants)
      .values({
        organizationId: ctx.organization.id,
        userId: input.userId,
        grantDate: input.grantDate,
        grantedDays: String(input.grantedDays),
        source: 'manual',
        note: input.note ?? null,
        createdByUserId: ctx.user.id,
      })
      .returning()
    if (!row) throw err('INSERT_FAILED')
    return { id: row.id }
  } catch (e) {
    // unique violation: 同じ grantDate が既にある
    const msg = (e as { message?: string }).message ?? ''
    if (msg.includes('leave_grant_user_date_uniq')) {
      throw err('GRANT_DATE_DUPLICATE')
    }
    throw e
  }
}

export async function removeLeaveGrantHandler(
  ctx: ApiCallerContext,
  input: RemoveLeaveGrantInput,
): Promise<{ ok: true }> {
  const [row] = await db
    .select()
    .from(leaveGrants)
    .where(eq(leaveGrants.id, input.grantId))
    .limit(1)
  if (!row || row.organizationId !== ctx.organization.id) throw err('NOT_FOUND')
  await db.delete(leaveGrants).where(eq(leaveGrants.id, input.grantId))
  return { ok: true }
}

// 任意のタイミングで auto 付与を補完する (UI の "自動同期" ボタン用)。
// userId 指定なら 1 名、省略なら org 全員。
export async function syncAutoLeaveGrantsHandler(
  ctx: ApiCallerContext,
  input: SyncAutoLeaveGrantsInput,
  asOfDate: string,
): Promise<{ syncedCount: number }> {
  const memberRows = await db
    .select()
    .from(memberships)
    .where(
      input.userId
        ? and(
            eq(memberships.organizationId, ctx.organization.id),
            eq(memberships.userId, input.userId),
          )
        : eq(memberships.organizationId, ctx.organization.id),
    )
  let syncedCount = 0
  for (const m of memberRows) {
    if (
      !m.hireDate ||
      m.weeklyScheduledDays == null ||
      m.weeklyScheduledHours == null
    ) {
      continue
    }
    const before = await db
      .select({ id: leaveGrants.id })
      .from(leaveGrants)
      .where(
        and(
          eq(leaveGrants.organizationId, ctx.organization.id),
          eq(leaveGrants.userId, m.userId),
        ),
      )
    await ensureAutoGrants(
      ctx,
      m.userId,
      m.hireDate,
      m.weeklyScheduledDays,
      Number(m.weeklyScheduledHours),
      asOfDate,
    )
    const after = await db
      .select({ id: leaveGrants.id })
      .from(leaveGrants)
      .where(
        and(
          eq(leaveGrants.organizationId, ctx.organization.id),
          eq(leaveGrants.userId, m.userId),
        ),
      )
    syncedCount += after.length - before.length
  }
  return { syncedCount }
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
 * - hireDate/weekly が設定済なら、leave_grants に未登録の auto 付与を補完してから読む (lazy sync)
 * - 設定が未済でも leave_grants に手動付与があればそれだけで残高を返す (admin 初期設定対応)
 * - hire/weekly すべて未設定 + leave_grants も空 → UNCONFIGURED
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
  if (!m) return { status: 'UNCONFIGURED' }

  // hire/weekly 設定済なら不足分の auto 付与を補完
  const isConfigured =
    !!m.hireDate &&
    m.weeklyScheduledDays != null &&
    m.weeklyScheduledHours != null
  if (
    isConfigured &&
    m.hireDate &&
    m.weeklyScheduledDays != null &&
    m.weeklyScheduledHours != null
  ) {
    await ensureAutoGrants(
      ctx,
      ctx.user.id,
      m.hireDate,
      m.weeklyScheduledDays,
      Number(m.weeklyScheduledHours),
      asOfDate,
    )
  }

  // DB から付与履歴を取得
  const grantRows = await db
    .select()
    .from(leaveGrants)
    .where(
      and(
        eq(leaveGrants.organizationId, ctx.organization.id),
        eq(leaveGrants.userId, ctx.user.id),
      ),
    )
    .orderBy(leaveGrants.grantDate)

  // 設定未済かつ手動付与もない → UNCONFIGURED
  if (!isConfigured && grantRows.length === 0) {
    return { status: 'UNCONFIGURED' }
  }

  const grants = grantRows.map(rowToLaborGrant)

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
    hireDate: m.hireDate ?? '(未設定)',
    weeklyScheduledDays: m.weeklyScheduledDays ?? 0,
    weeklyScheduledHours:
      m.weeklyScheduledHours == null ? 0 : Number(m.weeklyScheduledHours),
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
