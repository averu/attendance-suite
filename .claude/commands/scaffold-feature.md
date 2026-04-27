---
description: 新しい features ディレクトリを kebab-case 名で生成
argument-hint: <feature-name>
allowed-tools: Bash(mkdir *), Write, Read
---

`src/features/$ARGUMENTS/` 配下に features 凝集の雛形一式を作成する。

## 手順

1. `$ARGUMENTS` を kebab-case として受け取る (例: `user-profile`)
2. PascalCase / camelCase が必要なときはローカルで変換 (例: `UserProfile` / `userProfile`)
3. 以下を生成:

```
src/features/<name>/
├── components/.gitkeep
├── hooks/.gitkeep
├── server/.gitkeep
├── queries.ts        # queryOptions ファクトリ
├── schemas.ts        # zod schema
├── types.ts          # 公開する型
├── index.ts          # 公開境界 (このファイル経由でのみ外から触る)
└── __tests__/.gitkeep
```

## queries.ts 雛形

```ts
import { queryOptions } from '@tanstack/react-query'
// import server fns from './server/...'

export const <camelCaseName>Queries = {
  all: () => queryOptions({
    queryKey: ['<name>', 'all'],
    queryFn: () => { throw new Error('TODO: wire server fn') },
  }),
}
```

## schemas.ts 雛形

```ts
import { z } from 'zod'

export const <PascalCaseName>Schema = z.object({
  // TODO
})

export type <PascalCaseName> = z.infer<typeof <PascalCaseName>Schema>
```

## index.ts 雛形

```ts
// 公開境界。他 features や routes はこのファイル経由でのみ参照する。
export { <camelCaseName>Queries } from './queries'
export type { <PascalCaseName> } from './schemas'
// components はここに追加する: export { Foo } from './components/Foo'
```

参考: @docs/architecture.md
