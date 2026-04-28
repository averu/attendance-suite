import { createFileRoute } from '@tanstack/react-router'
import { eq } from 'drizzle-orm'
import { db } from '@/shared/lib/db.server'
import { memberships, organizations } from '@/db/schema'
import { auth } from '@/features/auth/server/auth.server'

// GET /api/me — 現在の user に紐づく membership / organization を返す。
export const Route = createFileRoute('/api/me')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const session = await auth.api.getSession({ headers: request.headers })
        if (!session?.user) {
          return Response.json({ membership: null, organization: null }, { status: 401 })
        }
        const rows = await db
          .select({ m: memberships, o: organizations })
          .from(memberships)
          .innerJoin(organizations, eq(organizations.id, memberships.organizationId))
          .where(eq(memberships.userId, session.user.id))
          .limit(1)
        const row = rows[0]
        return Response.json({
          membership: row
            ? {
                id: row.m.id,
                organizationId: row.m.organizationId,
                role: row.m.role,
              }
            : null,
          organization: row
            ? {
                id: row.o.id,
                name: row.o.name,
                slug: row.o.slug,
                timezone: row.o.timezone,
              }
            : null,
        })
      },
    },
  },
})
