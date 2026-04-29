import { createFileRoute } from '@tanstack/react-router'
import { asc, eq } from 'drizzle-orm'
import { db } from '@/shared/lib/db.server'
import { memberships, organizations, userPreferences } from '@/db/schema'
import { auth } from '@/features/auth/server/auth.server'
import { pickActiveMembership } from '@/shared/server/pickActiveMembership'

// GET /api/me — 現在の user の membership / organization / availableOrganizations を返す。
export const Route = createFileRoute('/api/me')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const session = await auth.api.getSession({ headers: request.headers })
        if (!session?.user) {
          return Response.json(
            {
              membership: null,
              organization: null,
              availableOrganizations: [],
            },
            { status: 401 },
          )
        }
        const rows = await db
          .select({ m: memberships, o: organizations })
          .from(memberships)
          .innerJoin(organizations, eq(organizations.id, memberships.organizationId))
          .where(eq(memberships.userId, session.user.id))
          .orderBy(asc(memberships.createdAt))

        const prefRows = await db
          .select()
          .from(userPreferences)
          .where(eq(userPreferences.userId, session.user.id))
          .limit(1)
        const activeOrgId = prefRows[0]?.activeOrganizationId ?? null

        const picked = pickActiveMembership(rows, activeOrgId, (r) => r.m.organizationId)
        const availableOrganizations = rows.map((r) => ({
          id: r.o.id,
          name: r.o.name,
          slug: r.o.slug,
          role: r.m.role,
        }))

        return Response.json({
          membership: picked
            ? {
                id: picked.m.id,
                organizationId: picked.m.organizationId,
                role: picked.m.role,
              }
            : null,
          organization: picked
            ? {
                id: picked.o.id,
                name: picked.o.name,
                slug: picked.o.slug,
                timezone: picked.o.timezone,
                dailyScheduledMinutes: picked.o.dailyScheduledMinutes,
                weeklyScheduledMinutes: picked.o.weeklyScheduledMinutes,
                legalHolidayDow: picked.o.legalHolidayDow,
              }
            : null,
          availableOrganizations,
        })
      },
    },
  },
})
