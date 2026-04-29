import { asc, eq } from 'drizzle-orm'
import { db } from '@/shared/lib/db.server'
import { memberships, organizations, userPreferences } from '@/db/schema'
import { auth } from '@/features/auth/server/auth.server'
import { pickActiveMembership } from './pickActiveMembership'

export type ApiRole = 'member' | 'admin' | 'owner'

export type ApiCallerContext = {
  user: { id: string; email: string; name: string }
  membership: { id: string; organizationId: string; role: ApiRole }
  organization: { id: string; name: string; slug: string; timezone: string }
}

export type Resolved =
  | { ok: true; ctx: ApiCallerContext }
  | { ok: false; status: number; code: string }

export async function resolveCaller(request: Request): Promise<Resolved> {
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session?.user) return { ok: false, status: 401, code: 'UNAUTHORIZED' }

  // user の全 membership を取得 (作成順)
  const rows = await db
    .select({ m: memberships, o: organizations })
    .from(memberships)
    .innerJoin(organizations, eq(organizations.id, memberships.organizationId))
    .where(eq(memberships.userId, session.user.id))
    .orderBy(asc(memberships.createdAt))
  if (rows.length === 0) return { ok: false, status: 403, code: 'NO_MEMBERSHIP' }

  // user_preference から active organization を取得
  const prefRows = await db
    .select()
    .from(userPreferences)
    .where(eq(userPreferences.userId, session.user.id))
    .limit(1)
  const activeOrgId = prefRows[0]?.activeOrganizationId ?? null

  const picked = pickActiveMembership(rows, activeOrgId, (r) => r.m.organizationId)
  if (!picked) return { ok: false, status: 403, code: 'NO_MEMBERSHIP' }

  return {
    ok: true,
    ctx: {
      user: {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
      },
      membership: {
        id: picked.m.id,
        organizationId: picked.m.organizationId,
        role: picked.m.role as ApiRole,
      },
      organization: {
        id: picked.o.id,
        name: picked.o.name,
        slug: picked.o.slug,
        timezone: picked.o.timezone,
      },
    },
  }
}

export function errorResponse(status: number, code: string): Response {
  return Response.json({ error: code }, { status })
}

export function requireAdmin(ctx: ApiCallerContext): Response | null {
  if (ctx.membership.role !== 'admin' && ctx.membership.role !== 'owner') {
    return errorResponse(403, 'REQUIRE_ADMIN')
  }
  return null
}

export function requireOwner(ctx: ApiCallerContext): Response | null {
  if (ctx.membership.role !== 'owner') {
    return errorResponse(403, 'REQUIRE_OWNER')
  }
  return null
}
