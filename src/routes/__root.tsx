import {
  createRootRouteWithContext,
  Outlet,
  HeadContent,
  Scripts,
  Link,
} from '@tanstack/react-router'
import { QueryClientProvider } from '@tanstack/react-query'
import type { RouterContext } from '@/router'
import { authQueries } from '@/features/auth'
import { publicEnv } from '@/shared/config/env.public'
import { Toaster } from '@/shared/ui/sonner'
import { Button } from '@/shared/ui/button'
import globalsCss from '@/styles/globals.css?url'

export const Route = createRootRouteWithContext<RouterContext>()({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: publicEnv.VITE_PUBLIC_APP_NAME },
    ],
    links: [{ rel: 'stylesheet', href: globalsCss }],
  }),
  beforeLoad: async ({ context }) => {
    const auth = await context.queryClient.ensureQueryData(authQueries.session())
    return { auth }
  },
  notFoundComponent: NotFoundScreen,
  component: RootComponent,
})

function NotFoundScreen() {
  return (
    <main className="container mx-auto flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-4xl font-bold tracking-tight">404</h1>
      <p className="text-muted-foreground">ページが見つかりませんでした。</p>
      <Button asChild>
        <Link to="/">トップへ</Link>
      </Button>
    </main>
  )
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext()
  return (
    <QueryClientProvider client={queryClient}>
      <RootDocument>
        <Outlet />
        <Toaster richColors closeButton position="top-right" />
      </RootDocument>
    </QueryClientProvider>
  )
}

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  )
}
