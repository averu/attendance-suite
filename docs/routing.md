# Routing — TanStack Router (file-based)

## ファイル配置

`src/routes/` がルート定義のルート。

```
src/routes/
├── __root.tsx                    # createRootRouteWithContext<{ queryClient, auth }>()
├── (public)/                     # route group (URL に出ない、純グルーピング)
│   ├── index.tsx                 # /
│   └── login.tsx                 # /login
├── (app)/
│   └── _authed/                  # pathless layout (URL に出ない、共通レイアウト)
│       ├── route.tsx             # beforeLoad で認可チェック
│       ├── dashboard.tsx         # /dashboard
│       └── posts.$postId.tsx     # /posts/:postId
└── api/
    └── auth/$.ts                 # Better Auth catch-all
```

## 命名規則

| 接頭辞 / 形式 | 意味 |
|---|---|
| `(group)` | route group。URL に影響しない、組織化目的 |
| `_pathless` | pathless layout。URL に出ないがレイアウトを共有 |
| `$param` | path parameter。`$postId` → `/:postId` |
| `-prefix` | route 生成から除外。一時的な colocation 用 (`-components/`, `-utils.ts`) |
| `__root` | アプリの最上位レイアウト |

## __root.tsx

```tsx
import { createRootRouteWithContext, Outlet } from '@tanstack/react-router'
import type { QueryClient } from '@tanstack/react-query'
import type { AuthState } from '@/features/auth'

export interface RouterContext {
  queryClient: QueryClient
  auth: AuthState
}

export const Route = createRootRouteWithContext<RouterContext>()({
  component: () => <Outlet />,
})
```

## 認可 gate (pathless layout)

`src/routes/(app)/_authed/route.tsx`:

```tsx
import { createFileRoute, redirect, Outlet } from '@tanstack/react-router'

export const Route = createFileRoute('/(app)/_authed')({
  beforeLoad: ({ context, location }) => {
    if (!context.auth.user) {
      throw redirect({
        to: '/login',
        search: { redirect: location.href },
      })
    }
  },
  component: () => <Outlet />,
})
```

## データ取得 (loader + ensureQueryData)

```tsx
import { createFileRoute } from '@tanstack/react-router'
import { postsQueries, PostDetail } from '@/features/posts'

export const Route = createFileRoute('/(app)/_authed/posts/$postId')({
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(postsQueries.detail(params.postId)),
  component: PostDetail,
})
```

- **critical data**: `await ensureQueryData(...)` で待つ
- **deferred data**: `prefetchQuery(...)` (await しない) → component で `useQuery`
- **prefetch**: `<Link to="/posts/$postId" params={...} preload="intent" />` で hover/touch 時に loader 発火

## route group の使い分け

- `(public)`: 認証不要 (ランディング、login)
- `(app)`: 認証必要 (アプリ本体)
- `(marketing)`: マーケサイト
- `(admin)`: 管理画面 (別の認可レベル)

## colocation (一時部品)

route ファイルだけで使う部品は `-` プレフィクスで route 生成対象から外せる:

```
src/routes/(app)/_authed/posts/
├── index.tsx
├── -components/
│   └── PostFilters.tsx           # ここで一回しか使わない
└── -hooks/
    └── usePostListUI.ts
```

**昇格ルール**: 2 箇所以上で使う / ドメインの再利用が始まったら `src/features/posts/` に移す。

## アンチパターン

- routes/ ファイルにロジック直書き → features へ
- 認可を route ごとに `beforeLoad` で繰り返す → pathless layout に集約
- loader で fetch を直接書く → queryOptions ファクトリ経由
