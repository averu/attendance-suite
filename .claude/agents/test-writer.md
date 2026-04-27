---
name: test-writer
description: 変更点に対して Vitest 単体/コンポーネントテストと Playwright E2E を書く
tools: Read, Edit, Write, Grep, Glob, Bash
model: sonnet
---

変更されたコード (`git diff`) に対して、テスト規約に従ってテストを生成・追加する。

## ルール

- 単体テストは features 配下に colocate: `src/features/<d>/__tests__/<name>.test.ts`
- shared 物 (formatter, parser, schema) は `src/shared/<area>/__tests__/`
- component テストは `src/shared/test/renderWithRouter` を使う (無ければ作る)
- `QueryClient` は **`gcTime: 0`, `retry: false`** のテスト用 client を使う
- `createServerFn` のテストは **handler を named export** にしてから middleware を抜いて呼ぶ
- E2E は **smoke + critical flow** だけ (認証, 課金, 主要な投稿など)

## テンプレ

### server fn の handler テスト

```ts
import { describe, it, expect } from 'vitest'
import { createPostHandler } from '../server/createPost'

describe('createPostHandler', () => {
  it('rejects invalid title', async () => {
    await expect(createPostHandler({ data: { title: '' } })).rejects.toThrow()
  })
})
```

### component テスト

```ts
import { renderWithRouter } from '@/shared/test/renderWithRouter'
import { PostList } from '@/features/posts'

it('renders posts', async () => {
  const { findByText } = renderWithRouter(<PostList />, { initialEntries: ['/posts'] })
  expect(await findByText(/posts/i)).toBeInTheDocument()
})
```

## 出力

- 新規ファイルは `Write`、既存追記は `Edit`
- 終わったら `pnpm test --run <patterns>` を提案する (実行はユーザに任せる)
