import { and, eq, isNull } from 'drizzle-orm'
import { randomBytes } from 'node:crypto'
import { db } from '@/shared/lib/db.server'
import {
  memberships,
  invitations,
  organizations,
  users,
} from '@/db/schema'
import type {
  ApiCallerContext,
} from '@/shared/server/apiAuth'
import type {
  AcceptInvitationInput,
  ChangeRoleInput,
  InviteInput,
  RemoveMemberInput,
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

export async function acceptInvitationHandler(
  ctx: ApiCallerContext,
  input: AcceptInvitationInput,
): Promise<{ ok: true; organizationId: string }> {
  // 既に組織所属しているなら拒否
  const existing = await db
    .select()
    .from(memberships)
    .where(eq(memberships.userId, ctx.user.id))
    .limit(1)
  if (existing.length > 0) {
    const e = new Error('ALREADY_MEMBER')
    ;(e as { code?: string }).code = 'ALREADY_MEMBER'
    throw e
  }

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

export async function updateOrganizationHandler(
  ctx: ApiCallerContext,
  input: UpdateOrganizationInput,
): Promise<{ ok: true }> {
  await db
    .update(organizations)
    .set({ name: input.name, timezone: input.timezone, updatedAt: new Date() })
    .where(eq(organizations.id, ctx.organization.id))
  return { ok: true }
}
