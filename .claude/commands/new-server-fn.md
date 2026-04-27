---
description: zod validator 付きの createServerFn を新規ファイルで生成
argument-hint: <feature-name> <fn-name> <method:GET|POST>
allowed-tools: Write, Read, Bash(mkdir *)
---

`src/features/$1/server/$2.ts` に `createServerFn` 雛形を生成する。method は `$3` (GET/POST)。

## 雛形

```ts
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
// import { authMiddleware } from '@/shared/server/middleware/auth'

const <camelCase>Input = z.object({
  // TODO: 入力スキーマ
})

// handler を named export してテストから middleware 抜きで呼べるようにする
export const <camelCase>Handler = async ({ data }: { data: z.infer<typeof <camelCase>Input> }) => {
  // TODO: 実装
  return { ok: true as const }
}

export const <camelCase>Fn = createServerFn({ method: '$3' })
  // .middleware([authMiddleware])
  .inputValidator((raw) => <camelCase>Input.parse(raw))
  .handler(<camelCase>Handler)
```

## ルール

- `inputValidator` を**必ず**付ける (zod parse を関数で包む)
- handler は named export (テスト用)
- 認証/権限/ロギングなどの横串は `src/shared/server/middleware/` の middleware で
- `server/` 配下は server-only。client コードからの import は ESLint で禁止される

参考: @docs/server-fns.md
