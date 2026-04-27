# Server Functions

## シグネチャ (TanStack Start v1)

```ts
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

const Input = z.object({
  email: z.string().email().max(255),
  password: z.string().min(8).max(100),
})

export const loginHandler = async ({ data }: { data: z.infer<typeof Input> }) => {
  // 検証済みの data を受ける
  return { ok: true as const }
}

export const loginFn = createServerFn({ method: 'POST' })
  .inputValidator((raw) => Input.parse(raw))
  .handler(loginHandler)
```

## 必須ルール

1. **`.inputValidator()` を必ず付ける** — 未検証データは handler に通さない
2. **handler を named export** — テスト時に middleware を抜いて呼ぶため
3. **server-only** — `src/features/<d>/server/` 配下に置き、client から import しない
4. **`server/` 配下を ESLint で隔離** — `import/no-restricted-paths` 参照: @docs/architecture.md

## Middleware (横串)

`src/shared/server/middleware/auth.ts`:

```ts
import { createMiddleware } from '@tanstack/react-start'

export const authMiddleware = createMiddleware({ type: 'function' })
  .server(async ({ next }) => {
    const session = await getSession()  // cookie から取得
    if (!session) throw new Error('UNAUTHORIZED')
    return next({ context: { user: session.user } })
  })
```

server fn に装着:

```ts
export const createPostFn = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .inputValidator((raw) => CreatePostInput.parse(raw))
  .handler(async ({ data, context }) => {
    // context.user が available (型安全)
  })
```

横串候補:
- `auth` — セッション検証 / user 注入
- `logger` — リクエストログ
- `tenant` — マルチテナンシ
- `rateLimit` — レート制限
- `traceId` — 分散トレース ID

## エラーハンドリング

- 404 / not-found: `notFound()` (from `@tanstack/react-router`)
- redirect: `throw redirect({ to: '/login' })`
- 業務エラー: 専用 Error クラス (例: `class ValidationError extends Error`)
- 型: handler の戻り値は `Result<Ok, Err>` パターンも検討

## 環境変数

- **server**: `process.env.*` 全アクセス可
- **client**: `import.meta.env.VITE_*` のみ
- **誤って漏らさないために**:
  - `src/shared/config/env.server.ts` で zod parse、`createServerOnlyFn` でラップ
  - `src/shared/config/env.client.ts` は `VITE_` 接頭辞のみ
  - シークレットに `VITE_` を**絶対に付けない**

```ts
// src/shared/config/env.server.ts
import { createServerOnlyFn } from '@tanstack/react-start'
import { z } from 'zod'

const ServerEnv = z.object({
  BETTER_AUTH_SECRET: z.string().min(32),
  DATABASE_URL: z.string().url(),
})

export const serverEnv = createServerOnlyFn(() => ServerEnv.parse(process.env))
```

## テスト

- handler を named export しているので middleware 抜きで直接呼べる
- 詳細: @docs/testing.md

## 既知の注意点

- `inputValidator` は古いバージョンで `ValidatorFn` 形しか受け付けないバグ報告あり ([router#2759](https://github.com/TanStack/router/issues/2759))。**zod の `.parse` を関数で包む書き方が安全**
- 過去版で middleware が client bundle に混入する事例 ([router#2783](https://github.com/TanStack/router/issues/2783))。最新で再発したら middleware を handler 内に移す回避を検討
