import { createIsomorphicFn } from '@tanstack/react-start'
import type { AuthState } from './types'

// SSR と CSR で実装を分ける。
// - SSR: Better Auth の auth.api.getSession を直接 + DB 直接 lookup (ループしない)
// - CSR: authClient.getSession() (HTTP) + /api/me fetch
//
// .server() の本体は Vite plugin によって client bundle から tree-shake されるので
// import-protection に抵触せず server-only deps を使える。
export const getAuthState = createIsomorphicFn()
  .server(async (): Promise<AuthState> => {
    const [
      { getRequest },
      { auth },
      { db },
      { memberships, organizations },
      { eq },
    ] = await Promise.all([
      import('@tanstack/react-start/server'),
      import('./server/auth.server'),
      import('@/shared/lib/db.server'),
      import('@/db/schema'),
      import('drizzle-orm'),
    ])
    const request = getRequest()
    const session = await auth.api.getSession({ headers: request.headers })
    if (!session?.user) {
      return { user: null, membership: null, organization: null }
    }
    const rows = await db
      .select({ m: memberships, o: organizations })
      .from(memberships)
      .innerJoin(organizations, eq(organizations.id, memberships.organizationId))
      .where(eq(memberships.userId, session.user.id))
      .limit(1)
    const row = rows[0]
    return {
      user: {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
      },
      membership: row
        ? {
            id: row.m.id,
            organizationId: row.m.organizationId,
            role: row.m.role as 'member' | 'admin' | 'owner',
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
    }
  })
  .client(async (): Promise<AuthState> => {
    const { authClient } = await import('./authClient')
    const result = await authClient.getSession()
    const user = result.data?.user
    if (!user) {
      return { user: null, membership: null, organization: null }
    }
    let membership: AuthState['membership'] = null
    let organization: AuthState['organization'] = null
    try {
      const meRes = await fetch('/api/me', { credentials: 'include' })
      if (meRes.ok) {
        const me = (await meRes.json()) as Pick<AuthState, 'membership' | 'organization'>
        membership = me.membership
        organization = me.organization
      }
    } catch {
      // ignore
    }
    return {
      user: { id: user.id, email: user.email, name: user.name ?? '' },
      membership,
      organization,
    }
  })
