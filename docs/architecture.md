# Architecture — features 凝集

## 原則

1. **routes は薄いシェル**: `src/routes/` のファイルは loader と component の連結だけ。実装は features へ。
2. **features は自己完結**: `src/features/<domain>/` に components / hooks / server / queries / schemas / types / index を持つ。
3. **公開境界は `index.ts`**: 他 features や routes は features の **`index.ts` 経由でのみ参照**する。深い import 禁止。
4. **server 越境禁止**: `src/features/<d>/server/` への client コード (`components/`, `hooks/`) からの import 禁止。`queries.ts` に挟まれた境界経由でのみ呼ぶ。

## レイアウト

```
src/
├── routes/                       # URL シェル
│   ├── __root.tsx
│   ├── (public)/
│   │   └── index.tsx
│   ├── (app)/
│   │   └── _authed/              # pathless layout (認可 gate)
│   │       ├── route.tsx         # beforeLoad で auth check
│   │       ├── dashboard.tsx
│   │       └── posts.$postId.tsx
│   └── api/
│       └── auth/$.ts             # Better Auth catch-all
│
├── features/
│   ├── auth/
│   │   ├── components/
│   │   ├── hooks/                # useSession など
│   │   ├── server/               # signIn / signOut server fn
│   │   ├── queries.ts
│   │   ├── schemas.ts
│   │   ├── types.ts
│   │   └── index.ts
│   ├── posts/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── server/
│   │   ├── queries.ts            # postsQueries.{ all, detail }
│   │   ├── schemas.ts
│   │   ├── types.ts
│   │   └── index.ts
│   └── ...
│
└── shared/
    ├── ui/                       # shadcn/ui components (生成先)
    ├── lib/                      # 汎用ユーティリティ
    ├── config/
    │   ├── env.server.ts         # zod parse、createServerOnlyFn でラップ
    │   └── env.client.ts         # VITE_ 接頭辞のみ
    ├── server/
    │   └── middleware/           # auth / logger / tenant / rate-limit
    └── test/
        └── renderWithRouter.tsx
```

## features 配下の細則

### `index.ts`

```ts
// 公開する物だけを re-export。server/ や internal は出さない。
export { PostList, PostDetail } from './components'
export { postsQueries } from './queries'
export type { Post } from './schemas'
```

### `queries.ts` (queryOptions ファクトリ)

```ts
import { queryOptions } from '@tanstack/react-query'
import { fetchPostsFn, fetchPostFn } from './server/posts'

export const postsQueries = {
  all: () => queryOptions({
    queryKey: ['posts', 'all'],
    queryFn: () => fetchPostsFn(),
  }),
  detail: (id: string) => queryOptions({
    queryKey: ['posts', 'detail', id],
    queryFn: () => fetchPostFn({ data: { id } }),
  }),
}
```

### `schemas.ts`

```ts
import { z } from 'zod'

export const PostSchema = z.object({
  id: z.string(),
  title: z.string().min(1).max(200),
  body: z.string(),
  createdAt: z.coerce.date(),
})

export type Post = z.infer<typeof PostSchema>
```

## ESLint で境界を強制

`eslint.config.js`:

```js
{
  rules: {
    'import/no-restricted-paths': ['error', {
      zones: [
        // server-only への client からの import 禁止
        { target: './src/features/*/components', from: './src/features/*/server' },
        { target: './src/features/*/hooks',      from: './src/features/*/server' },
        { target: './src/routes',                from: './src/features/*/server' },

        // features 間は index.ts 経由のみ
        {
          target: './src/features/!(_*)/!(index.ts|index.tsx)',
          from: './src/features/!(_*)/!(index.ts|index.tsx)',
        },
      ],
    }],
  },
}
```

## features 昇格ルール

- 一時的な部品は `src/routes/<path>/-components/` に colocation 可能 (`-` プレフィクスは route 生成から除外)
- 2 箇所以上で使う、もしくはドメイン共有が始まったら `src/features/<d>/components/` に昇格

## アンチパターン

- routes/ の中にビジネスロジック直書き
- features 同士の深い import (`features/a/internal/foo.ts` を `features/b` から触る)
- shared/ にビジネスロジックを置く (shared は横断的・汎用的なものだけ)
- 1 つの features が肥大化: 機能境界で分割を検討
