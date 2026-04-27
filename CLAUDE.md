# tanstack-start-app

React + Vite + TypeScript + TanStack Start で動かす features 凝集型アプリ。

## Stack

- React 19 / Vite / TypeScript (strict)
- TanStack Start v1 (RC) — `@tanstack/react-start`
- TanStack Router v1 (file-based)
- TanStack Query v5
- Better Auth (cookie session, `tanstackStartCookies` plugin)
- shadcn/ui (install path: `src/shared/ui`)
- Vitest + Playwright
- Tooling: pnpm + mise

## Commands

- `pnpm dev` — Vite + Start dev server
- `pnpm build` / `pnpm preview`
- `pnpm test` — Vitest
- `pnpm test:e2e` — Playwright
- `pnpm typecheck` — `tsc --noEmit -p .`
- `pnpm lint` — ESLint

## Layout (features 凝集)

- `src/routes/` — **薄いシェルだけ**。loader と component を features から組み立てる
- `src/features/<domain>/` — 実装の本体
  - `components/`, `hooks/`, `server/`, `queries.ts`, `schemas.ts`, `types.ts`, `index.ts`
  - `index.ts` 以外を直接 import するのは禁止 (ESLint で強制)
  - `server/` への client (`components/`, `hooks/`) からの import は禁止
- `src/shared/` — 横断: `ui/` (shadcn), `lib/`, `config/`, `server/middleware/`, `test/`

## 必須ルール

1. `vite.config.ts` のプラグイン順は **`tanstackStart()` → `viteReact()`**
2. `tsconfig.json` は **`verbatimModuleSyntax: false`** (server bundle 流出回避)
3. Route loader は navigation 時 **client で走る**。サーバ専用処理は必ず `createServerFn()`
4. シークレットに `VITE_` プレフィックスを付けない (client に漏れる)
5. `createServerFn` は `.inputValidator(zod)` を必ず付ける
6. routes/ にロジックを書かない。すべて features 側へ
7. features 間は `index.ts` 経由でのみ import

## ピットフォール対応

- Hydration mismatch: `Date.now`/`Math.random`/`window` を render に直書きしない。i18n/locale はサーバ側で確定し cookie 経由で client へ
- env: `src/shared/config/env.server.ts` (zod parse) と `env.client.ts` を分離
- server fn テスト: `handler` を named export して middleware 抜きで呼ぶ

## 詳細ドキュメント

- @docs/architecture.md — features 凝集の境界とディレクトリ規約
- @docs/routing.md — file-based routing と route group / pathless layout
- @docs/server-fns.md — createServerFn / middleware / validator
- @docs/auth.md — Better Auth セットアップ
- @docs/testing.md — Vitest / Playwright

## サブエージェント / コマンド

- `/scaffold-feature <name>` — features 雛形生成
- `/new-route <path> [feature]` — route ファイル雛形
- `/new-server-fn <feature> <name> <method>` — server fn 雛形
- `code-reviewer` — features 境界 / 薄シェル / server 越境チェック
- `test-writer` — Vitest / Playwright 生成
- `explorer` — 編集なしの調査専用
