import { createIsomorphicFn } from '@tanstack/react-start'
import type { AuthState, AvailableOrganization, Role } from './types'

// SSR と CSR で実装を分ける。
// - SSR: Better Auth の auth.api.getSession を直接 + DB 直接 lookup (ループしない)
// - CSR: authClient.getSession() (HTTP) + /api/me fetch
//
// .server() の本体は Vite plugin によって client bundle から tree-shake されるので
// import-protection に抵触せず server-only deps を使える。

const EMPTY_AUTH_STATE: AuthState = {
  user: null,
  membership: null,
  organization: null,
  availableOrganizations: [],
}

export const getAuthState = createIsomorphicFn()
  .server(async (): Promise<AuthState> => {
    const [
      { getRequest },
      { auth },
      { db },
      { memberships, organizations, userPreferences },
      { asc, eq },
      { pickActiveMembership },
    ] = await Promise.all([
      import('@tanstack/react-start/server'),
      import('./server/auth.server'),
      import('@/shared/lib/db.server'),
      import('@/db/schema'),
      import('drizzle-orm'),
      import('@/shared/server/pickActiveMembership'),
    ])
    const request = getRequest()
    const session = await auth.api.getSession({ headers: request.headers })
    if (!session?.user) return EMPTY_AUTH_STATE

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
    const availableOrganizations: AvailableOrganization[] = rows.map((r) => ({
      id: r.o.id,
      name: r.o.name,
      slug: r.o.slug,
      role: r.m.role as Role,
    }))

    return {
      user: {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
      },
      membership: picked
        ? {
            id: picked.m.id,
            organizationId: picked.m.organizationId,
            role: picked.m.role as Role,
          }
        : null,
      organization: picked
        ? {
            id: picked.o.id,
            name: picked.o.name,
            slug: picked.o.slug,
            timezone: picked.o.timezone,
          }
        : null,
      availableOrganizations,
    }
  })
  .client(async (): Promise<AuthState> => {
    const { authClient } = await import('./authClient')
    const result = await authClient.getSession()
    const user = result.data?.user
    if (!user) return EMPTY_AUTH_STATE

    let membership: AuthState['membership'] = null
    let organization: AuthState['organization'] = null
    let availableOrganizations: AvailableOrganization[] = []
    try {
      const meRes = await fetch('/api/me', { credentials: 'include' })
      if (meRes.ok) {
        const me = (await meRes.json()) as Pick<
          AuthState,
          'membership' | 'organization' | 'availableOrganizations'
        >
        membership = me.membership
        organization = me.organization
        availableOrganizations = me.availableOrganizations ?? []
      }
    } catch {
      // ignore
    }
    return {
      user: { id: user.id, email: user.email, name: user.name ?? '' },
      membership,
      organization,
      availableOrganizations,
    }
  })
