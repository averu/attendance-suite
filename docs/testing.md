# Testing

## レイヤ

| レイヤ | ツール | 配置 |
|---|---|---|
| 純粋関数 (formatter, parser, schema) | Vitest | `src/features/<d>/__tests__/` または sibling `*.test.ts` |
| queryOptions ファクトリ | Vitest | features 配下 |
| server fn handler | Vitest (named export を直接呼ぶ) | features 配下 |
| component | Vitest + @testing-library/react + jsdom | features 配下 (`renderWithRouter` 使用) |
| E2E | Playwright | `tests/e2e/` |

## test client (QueryClient)

```ts
// src/shared/test/createTestQueryClient.ts
import { QueryClient } from '@tanstack/react-query'

export const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { gcTime: 0, retry: false, staleTime: 0 },
      mutations: { retry: false },
    },
  })
```

## renderWithRouter

```tsx
// src/shared/test/renderWithRouter.tsx
import { render } from '@testing-library/react'
import {
  createRouter,
  createMemoryHistory,
  RouterProvider,
} from '@tanstack/react-router'
import { QueryClientProvider } from '@tanstack/react-query'
import { createTestQueryClient } from './createTestQueryClient'

export function renderWithRouter(
  ui: React.ReactElement,
  opts: { initialEntries?: string[] } = {},
) {
  const queryClient = createTestQueryClient()
  // 最小の routeTree をテスト用に組む or プロジェクトの routeTree.gen を使う
  // 詳細は公式 "Test File-Based Routing" を参照
  // ...
}
```

詳細: [Test File-Based Routing](https://tanstack.com/router/latest/docs/framework/react/how-to/test-file-based-routing)

## server fn のテスト

`createServerFn` は "use server" pragma に依存するため Vitest から直接実行できない ([router#2701](https://github.com/TanStack/router/discussions/2701))。**handler を named export して**それをテストする:

```ts
// src/features/posts/server/createPost.ts
export const createPostHandler = async ({ data }) => { /* ... */ }
export const createPostFn = createServerFn({ method: 'POST' })
  .inputValidator((raw) => CreatePostInput.parse(raw))
  .handler(createPostHandler)

// __tests__/createPost.test.ts
import { createPostHandler } from '../server/createPost'
it('rejects empty title', async () => {
  await expect(createPostHandler({ data: { title: '' } })).rejects.toThrow()
})
```

## E2E (Playwright)

- 範囲: smoke + critical flow (認証, 課金, 主要操作) に限定
- HMR / hydration 起因の flake は global setup で Vite サーバを立てて回避 ([router#5727](https://github.com/TanStack/router/discussions/5727))
- Playwright v1.56+ なら Planner / Generator / Healer の subagent パターンも検討

## コマンド

```bash
pnpm test                     # Vitest watch
pnpm test --run               # 1 回実行
pnpm test --run <pattern>     # 特定ファイル
pnpm test:e2e                 # Playwright
```

## アンチパターン

- Mock を server fn 側に書く (handler を直接呼べば不要)
- E2E で全機能をカバーしようとする (時間とコストが線形に増える)
- `gcTime` を本番値のままテストする (前テストの cache が残ってフレーキー化)
