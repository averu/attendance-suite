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
    │   └── env.public.ts         # VITE_PUBLIC_ 接頭辞のみ (server/client 両方で読む)
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

`eslint.config.js` の `import/no-restricted-paths` で以下を禁じる:

1. **server-only への client (components / hooks) からの import 禁止**
   `features/<d>/server/` は HTTP / DB に直接触る層。client コードは必ず `queries.ts` 経由で間接的に呼ぶ。

2. **UI route (`__root.tsx`, `(app)/**`, `(public)/**`) から `features/*/server/` への直接 import 禁止**
   UI route のロジックは features 側へ追い出すための制約。
   ⚠ **`src/routes/api/**` は server-only コンテキストなので例外として許可** している。
   API route は `createFileRoute(p)({ server: { handlers } })` 内で features の handler を直接呼び出す server-only ファイルなので、`features/*/server/` を取り込むのが正しい。

3. **`src/routes/api/**` は features の非公開ファイル直 import 禁止**
   API route の例外を入れたぶん、入口を **`index.ts` / `schemas.ts` / `server/**`** の 3 経路に絞る zone を別途追加している。
   これにより `routes/api/X.ts` から `features/<d>/canLeaveOrganization.ts` のような pure-function ファイルを直 import する抜け道を塞ぐ。
   pure 関数を API route で使いたい場合は **必ず `features/<d>/index.ts` から再 export** する。

4. **features 同士は `index.ts` 経由のみ** (= 他 feature の非公開ファイル直 import 禁止)
   `import/no-restricted-paths` のグロブは「同一親ディレクトリ」を表現できないため、`features/` 配下の各ディレクトリ名を読み取って **feature ペアごと** に zone を生成している。

```js
// 各 features ペア (A != B) について、
//   target: features/A/**         (= 自 feature 配下の任意ファイル)
//   from:   features/B/!(index.*) (= 他 feature の非公開ファイル)
// だけ禁じる。同一 feature 内の相対 import は影響しない。
const crossFeatureZones = featureNames.flatMap((target) =>
  featureNames
    .filter((from) => from !== target)
    .map((from) => ({
      target: `./src/features/${target}`,
      from: `./src/features/${from}/!(index.ts|index.tsx)`,
    })),
)

// zones:
[
  { target: './src/features/*/components', from: './src/features/*/server' },
  { target: './src/features/*/hooks',      from: './src/features/*/server' },
  {
    target: [
      './src/routes/__root.tsx',
      './src/routes/(app)/**',
      './src/routes/(public)/**',
    ],
    from: './src/features/*/server',
  },
  // routes/api は features の非公開ファイルを触らない
  // (index.ts / schemas.ts / server/** だけ許可)
  {
    target: './src/routes/api',
    from: [
      './src/features/*/!(index.ts|index.tsx|schemas.ts|server)',
      './src/features/*/components/**',
      './src/features/*/hooks/**',
    ],
  },
  ...crossFeatureZones,
]
```

## features 昇格ルール

- 一時的な部品は `src/routes/<path>/-components/` に colocation 可能 (`-` プレフィクスは route 生成から除外)
- 2 箇所以上で使う、もしくはドメイン共有が始まったら `src/features/<d>/components/` に昇格

## アンチパターン

- routes/ の中にビジネスロジック直書き
- features 同士の深い import (`features/a/internal/foo.ts` を `features/b` から触る)
- shared/ にビジネスロジックを置く (shared は横断的・汎用的なものだけ)
- 1 つの features が肥大化: 機能境界で分割を検討
