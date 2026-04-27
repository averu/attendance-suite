# Auth — Better Auth + TanStack Start

## セットアップ

### 1. インストール

```bash
pnpm add better-auth
```

### 2. config

`src/features/auth/server/auth.ts`:

```ts
import { betterAuth } from 'better-auth'
import { tanstackStartCookies } from 'better-auth/integrations/tanstack-start'

export const auth = betterAuth({
  secret: process.env.BETTER_AUTH_SECRET!,
  baseURL: process.env.BETTER_AUTH_URL!,
  emailAndPassword: { enabled: true },
  // socialProviders: { github: { clientId: ..., clientSecret: ... } },
  plugins: [
    // 他プラグインを使う場合は tanstackStartCookies を **配列の最後** に置く
    tanstackStartCookies(),
  ],
})
```

### 3. catch-all route

`src/routes/api/auth/$.ts`:

```ts
import { createServerFileRoute } from '@tanstack/react-start/server'
import { auth } from '@/features/auth/server/auth'

export const ServerRoute = createServerFileRoute('/api/auth/$').methods({
  GET: ({ request }) => auth.handler(request),
  POST: ({ request }) => auth.handler(request),
})
```

### 4. router context への注入

`src/router.tsx` (Start のエントリ):

```ts
import { createRouter } from '@tanstack/react-router'
import { QueryClient } from '@tanstack/react-query'
import { routeTree } from './routeTree.gen'

export function getRouter() {
  const queryClient = new QueryClient()
  return createRouter({
    routeTree,
    context: {
      queryClient,
      auth: { user: null }, // SSR 時に hydrate
    },
  })
}
```

`__root.tsx` の `beforeLoad` で session を取得して context に注入:

```ts
beforeLoad: async ({ context }) => {
  const session = await getSessionFn()  // server fn で auth.api.getSession を呼ぶ
  return { ...context, auth: { user: session?.user ?? null } }
},
```

## 認可 gate

詳細は @docs/routing.md。`src/routes/(app)/_authed/route.tsx` の `beforeLoad` で集約:

```tsx
beforeLoad: ({ context, location }) => {
  if (!context.auth.user) {
    throw redirect({ to: '/login', search: { redirect: location.href } })
  }
},
```

## features/auth の責務

- `src/features/auth/server/auth.ts` — Better Auth の config と instance
- `src/features/auth/server/session.ts` — `getSessionFn`, `signOutFn` などの server fn
- `src/features/auth/hooks/useSession.ts` — client 側 hook (`useQuery` で session 取得)
- `src/features/auth/components/AuthGuard.tsx` — 任意の boundary component
- `src/features/auth/index.ts` — 公開境界

`features/auth` は API を提供するだけで、URL マウント (login route 等) には**関与しない**。route 側で features/auth の API を組み立てる。

## env

`.env`:

```
BETTER_AUTH_SECRET=<32 文字以上のランダム文字列>
BETTER_AUTH_URL=http://localhost:3000
DATABASE_URL=...
```

シークレットなので **`VITE_` プレフィクス禁止**。

## 既知の落とし穴

- `multiSession` / `lastLoginMethod` / `oneTap` プラグインと同居で cookie が落ちない事例 ([better-auth#5639](https://github.com/better-auth/better-auth/issues/5639))
- Bun + Nitro でビルド失敗の事例 ([better-auth#7064](https://github.com/better-auth/better-auth/issues/7064))
- `tanstackStartCookies` (旧名 `reactStartCookies`) は **plugins 配列の最後** に置くこと
