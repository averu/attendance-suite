---
description: TanStack Router file-based route の新規ファイルを生成
argument-hint: <route-path> [feature-name]
allowed-tools: Write, Read, Bash(mkdir *)
---

`src/routes/$1.tsx` (または `src/routes/$1/index.tsx`) を `createFileRoute` 雛形で生成。

第二引数 `$2` で features 名が渡された場合は、loader と component をその features の `index.ts` から import する。

## 雛形 (features 連携あり)

```tsx
import { createFileRoute } from '@tanstack/react-router'
import { <camelCase>Queries, <PascalCase>Screen } from '@/features/$2'

export const Route = createFileRoute('/$1')({
  loader: ({ context }) => context.queryClient.ensureQueryData(<camelCase>Queries.all()),
  component: <PascalCase>Screen,
})
```

## 雛形 (features 連携なし)

```tsx
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/$1')({
  component: () => <div>$1</div>,
})
```

## ルール

- routes ファイルには **loader と component の連結だけ**を書く
- データ取得は `context.queryClient.ensureQueryData(<feature>Queries.X())` パターン
- 認可はディレクトリ `src/routes/(app)/_authed/` 配下に置き、`_authed/route.tsx` の `beforeLoad` で集約
- ロジックを直書きしない (features 側へ)

参考: @docs/routing.md
