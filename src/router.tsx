import { createRouter as createTanStackRouter } from '@tanstack/react-router'
import { QueryClient } from '@tanstack/react-query'
import { routeTree } from './routeTree.gen'
import type { AuthState } from '@/features/auth'

export interface RouterContext {
  queryClient: QueryClient
  auth: AuthState
}

export function getRouter() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { staleTime: 30_000, retry: false },
    },
  })

  return createTanStackRouter({
    routeTree,
    context: {
      queryClient,
      // __root の beforeLoad で session を hydrate する
      auth: { user: null, membership: null, organization: null },
    },
    defaultPreload: 'intent',
    defaultPreloadStaleTime: 0,
    scrollRestoration: true,
  })
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>
  }
}
