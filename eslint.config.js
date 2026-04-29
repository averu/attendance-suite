// @ts-check
import { readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import reactPlugin from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'
import importPlugin from 'eslint-plugin-import'
import globals from 'globals'

const __dirname = dirname(fileURLToPath(import.meta.url))
const featuresDir = resolve(__dirname, 'src/features')
const featureNames = readdirSync(featuresDir, { withFileTypes: true })
  .filter((e) => e.isDirectory() && !e.name.startsWith('_'))
  .map((e) => e.name)

// 各 features ペア (A != B) について
//   target: features/A/**           (= 自 feature 配下の任意ファイル)
//   from:   features/B/!(index.*)   (= 他 feature の非公開ファイル)
// だけ禁じる。同一 feature 内の相対 import は target/from が同じ feature になるので影響しない。
const crossFeatureZones = featureNames.flatMap((target) =>
  featureNames
    .filter((from) => from !== target)
    .map((from) => ({
      target: `./src/features/${target}`,
      from: `./src/features/${from}/!(index.ts|index.tsx)`,
      message: `Cross-feature imports must go through src/features/${from}/index.ts.`,
    })),
)

export default tseslint.config(
  {
    ignores: [
      'dist/**',
      '.output/**',
      '.tanstack/**',
      '.nitro/**',
      'node_modules/**',
      'src/routeTree.gen.ts',
      'src/db/migrations/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      globals: { ...globals.browser, ...globals.node },
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: {
      react: reactPlugin,
      'react-hooks': reactHooks,
      import: importPlugin,
    },
    settings: {
      react: { version: 'detect' },
      'import/resolver': {
        typescript: { alwaysTryTypes: true },
        node: true,
      },
    },
    rules: {
      ...reactPlugin.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],

      // 全角スペース (U+3000) を含む正規表現リテラルを許可する。
      // 日本語テキストの分割などで [\\s\\u3000] のように直接書くケースが頻出するため。
      'no-irregular-whitespace': ['error', { skipRegExps: true, skipStrings: true, skipTemplates: true, skipComments: true }],

      // ----- features 凝集の境界を強制 -----
      'import/no-restricted-paths': [
        'error',
        {
          zones: [
            // server-only への client (components/hooks) からの import 禁止
            {
              target: './src/features/*/components',
              from: './src/features/*/server',
              message: 'Do not import server modules from client components. Go through queries.ts.',
            },
            {
              target: './src/features/*/hooks',
              from: './src/features/*/server',
              message: 'Do not import server modules from client hooks. Go through queries.ts.',
            },
            // UI routes は features/*/server を直接触らない (queries 経由)。
            // ただし src/routes/api/** は server-only コンテキストなので例外として許可する。
            {
              target: [
                './src/routes/__root.tsx',
                './src/routes/(app)/**',
                './src/routes/(public)/**',
              ],
              from: './src/features/*/server',
              message:
                'UI routes must not import server modules directly. Go through feature index.ts / queries.ts. (API routes under src/routes/api/** are exempt.)',
            },

            // src/routes/api/** が features の非公開ファイルを直接触らないようにする。
            // 許可: index.ts / index.tsx / schemas.ts / server/** の 4 経路。
            // - 1 行目: features 直下の単一セグメントファイルで、index.ts / index.tsx / schemas.ts / server (= dir) 以外をすべて禁止
            //           (queries.ts / mutations.ts / types.ts / canLeaveOrganization.ts などの pure-function ファイルを catch-all)
            // - 2-3 行目: components / hooks 配下の deep import を禁止
            {
              target: './src/routes/api',
              from: [
                './src/features/*/!(index.ts|index.tsx|schemas.ts|server)',
                './src/features/*/components/**',
                './src/features/*/hooks/**',
              ],
              message:
                'API routes must import features through index.ts (public boundary), schemas.ts, or server/* — not internal/client modules.',
            },

            // features 同士は index.ts 経由のみ (動的に組み立てたペア)
            ...crossFeatureZones,
          ],
        },
      ],
    },
  },
  {
    // テストファイルは境界制約を緩める
    files: ['**/*.test.{ts,tsx}', 'tests/**/*.{ts,tsx}', 'src/shared/test/**/*.{ts,tsx}'],
    rules: {
      'import/no-restricted-paths': 'off',
    },
  },
)
