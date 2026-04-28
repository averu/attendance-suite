import { eq } from 'drizzle-orm'
import { db } from '@/shared/lib/db.server'
import { memberships, organizations } from '@/db/schema'
import { auth } from '@/features/auth/server/auth.server'

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
  const rows = await db
    .select({ m: memberships, o: organizations })
    .from(memberships)
    .innerJoin(organizations, eq(organizations.id, memberships.organizationId))
    .where(eq(memberships.userId, session.user.id))
    .limit(1)
  const row = rows[0]
  if (!row) return { ok: false, status: 403, code: 'NO_MEMBERSHIP' }
  return {
    ok: true,
    ctx: {
      user: {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
      },
      membership: {
        id: row.m.id,
        organizationId: row.m.organizationId,
        role: row.m.role as ApiRole,
      },
      organization: {
        id: row.o.id,
        name: row.o.name,
        slug: row.o.slug,
        timezone: row.o.timezone,
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
