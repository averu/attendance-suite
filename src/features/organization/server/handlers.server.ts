import { and, eq, inArray, isNull, sql } from 'drizzle-orm'
import { randomBytes } from 'node:crypto'
import { db } from '@/shared/lib/db.server'
import {
  memberships,
  invitations,
  organizations,
  users,
  userPreferences,
} from '@/db/schema'
import type {
  ApiCallerContext,
} from '@/shared/server/apiAuth'
import type {
  AcceptInvitationInput,
  BulkInviteInput,
  BulkRevokeInvitationsInput,
  ChangeRoleInput,
  InviteInput,
  RemoveMemberInput,
  RevokeInvitationInput,
  UpdateMemberWorkProfileInput,
  UpdateOrganizationInput,
} from '../schemas'
import type { Member, Invitation } from '../types'

const INVITATION_TTL_DAYS = 14

export async function listMembersHandler(ctx: ApiCallerContext): Promise<Member[]> {
  const rows = await db
    .select({
      m: memberships,
      u: users,
    })
    .from(memberships)
    .innerJoin(users, eq(users.id, memberships.userId))
    .where(eq(memberships.organizationId, ctx.organization.id))
  return rows.map((r) => ({
    membershipId: r.m.id,
    userId: r.u.id,
    email: r.u.email,
    name: r.u.name,
    role: r.m.role as Member['role'],
    joinedAt: r.m.createdAt.toISOString(),
    hireDate: r.m.hireDate ?? null,
    weeklyScheduledDays: r.m.weeklyScheduledDays ?? null,
    weeklyScheduledHours:
      r.m.weeklyScheduledHours == null ? null : Number(r.m.weeklyScheduledHours),
    laborCategory: r.m.laborCategory,
  }))
}

export async function listInvitationsHandler(
  ctx: ApiCallerContext,
): Promise<Invitation[]> {
  const rows = await db
    .select({
      i: invitations,
      inviter: users,
    })
    .from(invitations)
    .innerJoin(users, eq(users.id, invitations.invitedByUserId))
    .where(
      and(
        eq(invitations.organizationId, ctx.organization.id),
        isNull(invitations.acceptedAt),
      ),
    )
  return rows.map((r) => ({
    id: r.i.id,
    email: r.i.email,
    role: r.i.role as Invitation['role'],
    token: r.i.token,
    expiresAt: r.i.expiresAt.toISOString(),
    acceptedAt: r.i.acceptedAt ? r.i.acceptedAt.toISOString() : null,
    invitedByName: r.inviter.name,
    createdAt: r.i.createdAt.toISOString(),
  }))
}

function generateToken(): string {
  return randomBytes(24).toString('base64url')
}

export async function inviteMemberHandler(
  ctx: ApiCallerContext,
  input: InviteInput,
): Promise<{ token: string; expiresAt: string }> {
  const expiresAt = new Date(Date.now() + INVITATION_TTL_DAYS * 24 * 60 * 60 * 1000)
  const token = generateToken()

  const [row] = await db
    .insert(invitations)
    .values({
      organizationId: ctx.organization.id,
      email: input.email,
      role: input.role,
      token,
      expiresAt,
      invitedByUserId: ctx.user.id,
    })
    .returning()
  if (!row) throw new Error('invitation insert failed')
  return { token: row.token, expiresAt: row.expiresAt.toISOString() }
}

export type BulkInviteResultItem = {
  email: string
  status: 'invited' | 'skipped'
  /** invited 時の token (受諾 URL は呼び出し側で組み立て) */
  token?: string
  expiresAt?: string
  /** skipped 時の理由 */
  skipReason?: 'ALREADY_MEMBER' | 'INVITATION_PENDING'
}

/**
 * 一括招待 handler:
 *   - 同一 email を email lookup で重複排除 (case-insensitive)
 *   - 既に同 org の member は ALREADY_MEMBER で skip
 *   - 既に未受諾 (acceptedAt=null) の有効期限内 invitation がある email は INVITATION_PENDING で skip
 *   - 残りに新規 invitation を発行 (role は全件共通)
 */
export async function bulkInviteMembersHandler(
  ctx: ApiCallerContext,
  input: BulkInviteInput,
): Promise<{ items: BulkInviteResultItem[] }> {
  // 重複排除 (lowercase で比較)
  const seen = new Set<string>()
  const dedup: string[] = []
  for (const e of input.emails) {
    const key = e.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    dedup.push(e)
  }

  if (dedup.length === 0) return { items: [] }

  // 既存 membership: users.email join
  const memberRows = await db
    .select({ email: users.email })
    .from(memberships)
    .innerJoin(users, eq(users.id, memberships.userId))
    .where(eq(memberships.organizationId, ctx.organization.id))
  const memberEmails = new Set(memberRows.map((r) => r.email.toLowerCase()))

  // 既存の未受諾 invitation (期限切れは無視 = 再発行を許す)
  const now = new Date()
  const inviteRows = await db
    .select()
    .from(invitations)
    .where(
      and(
        eq(invitations.organizationId, ctx.organization.id),
        isNull(invitations.acceptedAt),
      ),
    )
  const pendingEmails = new Set(
    inviteRows
      .filter((r) => r.expiresAt.getTime() > now.getTime())
      .map((r) => r.email.toLowerCase()),
  )

  const items: BulkInviteResultItem[] = []
  const expiresAt = new Date(
    Date.now() + INVITATION_TTL_DAYS * 24 * 60 * 60 * 1000,
  )
  for (const email of dedup) {
    const key = email.toLowerCase()
    if (memberEmails.has(key)) {
      items.push({ email, status: 'skipped', skipReason: 'ALREADY_MEMBER' })
      continue
    }
    if (pendingEmails.has(key)) {
      items.push({ email, status: 'skipped', skipReason: 'INVITATION_PENDING' })
      continue
    }
    const token = generateToken()
    const [row] = await db
      .insert(invitations)
      .values({
        organizationId: ctx.organization.id,
        email,
        role: input.role,
        token,
        expiresAt,
        invitedByUserId: ctx.user.id,
      })
      .returning()
    if (!row) {
      // 失敗は skip 扱いで続行 (片付かない)
      items.push({ email, status: 'skipped', skipReason: 'INVITATION_PENDING' })
      continue
    }
    items.push({
      email,
      status: 'invited',
      token: row.token,
      expiresAt: row.expiresAt.toISOString(),
    })
  }

  return { items }
}

export async function acceptInvitationHandler(
  ctx: ApiCallerContext,
  input: AcceptInvitationInput,
): Promise<{ ok: true; organizationId: string }> {
  // multi-org: 既に同じ組織にメンバーシップがある場合のみ拒否、別組織なら OK

  const found = await db
    .select()
    .from(invitations)
    .where(eq(invitations.token, input.token))
    .limit(1)
  const inv = found[0]
  if (!inv) {
    const e = new Error('INVITATION_NOT_FOUND')
    ;(e as { code?: string }).code = 'INVITATION_NOT_FOUND'
    throw e
  }
  if (inv.acceptedAt) {
    const e = new Error('INVITATION_ALREADY_ACCEPTED')
    ;(e as { code?: string }).code = 'INVITATION_ALREADY_ACCEPTED'
    throw e
  }
  if (inv.expiresAt.getTime() < Date.now()) {
    const e = new Error('INVITATION_EXPIRED')
    ;(e as { code?: string }).code = 'INVITATION_EXPIRED'
    throw e
  }
  if (inv.email.toLowerCase() !== ctx.user.email.toLowerCase()) {
    const e = new Error('INVITATION_EMAIL_MISMATCH')
    ;(e as { code?: string }).code = 'INVITATION_EMAIL_MISMATCH'
    throw e
  }

  // 同じ org に既に membership があるなら multi-org でも重複扱い
  const dupExisting = await db
    .select()
    .from(memberships)
    .where(
      and(
        eq(memberships.userId, ctx.user.id),
        eq(memberships.organizationId, inv.organizationId),
      ),
    )
    .limit(1)
  if (dupExisting.length > 0) {
    const e = new Error('ALREADY_MEMBER')
    ;(e as { code?: string }).code = 'ALREADY_MEMBER'
    throw e
  }

  await db.transaction(async (tx) => {
    await tx.insert(memberships).values({
      organizationId: inv.organizationId,
      userId: ctx.user.id,
      role: inv.role,
    })
    await tx
      .update(invitations)
      .set({ acceptedAt: new Date() })
      .where(eq(invitations.id, inv.id))
    // 受諾した瞬間に active organization を新しい組織に切り替える。
    // 「招待リンク → 参加 → そのままその組織のダッシュボード」が自然な期待動線で、
    // クライアント側で switch-organization を別 RPC するより atomic に決まる。
    await tx
      .insert(userPreferences)
      .values({ userId: ctx.user.id, activeOrganizationId: inv.organizationId })
      .onConflictDoUpdate({
        target: userPreferences.userId,
        set: {
          activeOrganizationId: inv.organizationId,
          updatedAt: sql`now()`,
        },
      })
  })

  return { ok: true, organizationId: inv.organizationId }
}

export async function changeRoleHandler(
  ctx: ApiCallerContext,
  input: ChangeRoleInput,
): Promise<{ ok: true }> {
  const [row] = await db
    .select()
    .from(memberships)
    .where(eq(memberships.id, input.membershipId))
    .limit(1)
  if (!row || row.organizationId !== ctx.organization.id) {
    const e = new Error('NOT_FOUND')
    ;(e as { code?: string }).code = 'NOT_FOUND'
    throw e
  }
  // 自分自身の owner 剥奪は不可 (組織が owner 不在になるのを防ぐ簡易策)
  if (row.userId === ctx.user.id && row.role === 'owner' && input.role !== 'owner') {
    const e = new Error('CANNOT_DEMOTE_SELF_OWNER')
    ;(e as { code?: string }).code = 'CANNOT_DEMOTE_SELF_OWNER'
    throw e
  }
  await db
    .update(memberships)
    .set({ role: input.role, updatedAt: new Date() })
    .where(eq(memberships.id, input.membershipId))
  return { ok: true }
}

export async function revokeInvitationHandler(
  ctx: ApiCallerContext,
  input: RevokeInvitationInput,
): Promise<{ ok: true }> {
  const [row] = await db
    .select()
    .from(invitations)
    .where(eq(invitations.id, input.invitationId))
    .limit(1)
  // 他組織の招待は見せない: NOT_FOUND で透過させる (org id 漏洩を避ける)
  if (!row || row.organizationId !== ctx.organization.id) {
    const e = new Error('INVITATION_NOT_FOUND')
    ;(e as { code?: string }).code = 'INVITATION_NOT_FOUND'
    throw e
  }
  // 受諾済は membership として残っているので削除不可。膜外しはメンバー削除フローで行う
  if (row.acceptedAt) {
    const e = new Error('INVITATION_ALREADY_ACCEPTED')
    ;(e as { code?: string }).code = 'INVITATION_ALREADY_ACCEPTED'
    throw e
  }
  await db.delete(invitations).where(eq(invitations.id, input.invitationId))
  return { ok: true }
}

/**
 * 一括削除: 自 org のもの + 未受諾 (acceptedAt=null) のみ DELETE。
 * 受諾済の ID が混じっていても skip して処理を進める。
 * 戻り値: { deletedCount, skippedCount } (skipped = 他組織 + 受諾済 + 存在しない)
 */
export async function bulkRevokeInvitationsHandler(
  ctx: ApiCallerContext,
  input: BulkRevokeInvitationsInput,
): Promise<{ deletedCount: number; skippedCount: number }> {
  if (input.invitationIds.length === 0) {
    return { deletedCount: 0, skippedCount: 0 }
  }
  const rows = await db
    .select()
    .from(invitations)
    .where(inArray(invitations.id, input.invitationIds))
  const targetIds = rows
    .filter(
      (r) => r.organizationId === ctx.organization.id && r.acceptedAt === null,
    )
    .map((r) => r.id)
  const skippedCount = input.invitationIds.length - targetIds.length
  if (targetIds.length === 0) {
    return { deletedCount: 0, skippedCount }
  }
  await db.delete(invitations).where(inArray(invitations.id, targetIds))
  return { deletedCount: targetIds.length, skippedCount }
}

export async function removeMemberHandler(
  ctx: ApiCallerContext,
  input: RemoveMemberInput,
): Promise<{ ok: true }> {
  const [row] = await db
    .select()
    .from(memberships)
    .where(eq(memberships.id, input.membershipId))
    .limit(1)
  if (!row || row.organizationId !== ctx.organization.id) {
    const e = new Error('NOT_FOUND')
    ;(e as { code?: string }).code = 'NOT_FOUND'
    throw e
  }
  if (row.userId === ctx.user.id) {
    const e = new Error('CANNOT_REMOVE_SELF')
    ;(e as { code?: string }).code = 'CANNOT_REMOVE_SELF'
    throw e
  }
  await db.delete(memberships).where(eq(memberships.id, input.membershipId))
  return { ok: true }
}

/**
 * メンバーの労務情報 (雇入日・週所定) を更新する。owner / admin が呼ぶ。
 * NOT_FOUND: 他組織の membership は触らない。
 * weeklyScheduledHours は numeric カラムなので文字列で渡してもよいが、ここでは number → string 変換。
 */
export async function updateMemberWorkProfileHandler(
  ctx: ApiCallerContext,
  input: UpdateMemberWorkProfileInput,
): Promise<{ ok: true }> {
  const [row] = await db
    .select()
    .from(memberships)
    .where(eq(memberships.id, input.membershipId))
    .limit(1)
  if (!row || row.organizationId !== ctx.organization.id) {
    const e = new Error('NOT_FOUND')
    ;(e as { code?: string }).code = 'NOT_FOUND'
    throw e
  }
  await db
    .update(memberships)
    .set({
      hireDate: input.hireDate,
      weeklyScheduledDays: input.weeklyScheduledDays,
      weeklyScheduledHours:
        input.weeklyScheduledHours == null
          ? null
          : String(input.weeklyScheduledHours),
      laborCategory: input.laborCategory,
      updatedAt: new Date(),
    })
    .where(eq(memberships.id, input.membershipId))
  return { ok: true }
}

export async function updateOrganizationHandler(
  ctx: ApiCallerContext,
  input: UpdateOrganizationInput,
): Promise<{ ok: true }> {
  await db
    .update(organizations)
    .set({
      name: input.name,
      timezone: input.timezone,
      dailyScheduledMinutes: input.dailyScheduledMinutes,
      weeklyScheduledMinutes: input.weeklyScheduledMinutes,
      legalHolidayDow: input.legalHolidayDow,
      updatedAt: new Date(),
    })
    .where(eq(organizations.id, ctx.organization.id))
  return { ok: true }
}
