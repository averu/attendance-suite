// @ts-check
import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import reactPlugin from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'
import importPlugin from 'eslint-plugin-import'
import globals from 'globals'

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
            {
              target: './src/routes',
              from: './src/features/*/server',
              message: 'Do not import server modules directly from routes. Use feature index.ts.',
            },

            // features 同士は index.ts 経由のみ
            {
              target: './src/features/!(_*)/!(index.ts|index.tsx)',
              from: './src/features/!(_*)/!(index.ts|index.tsx)',
              message: 'Cross-feature imports must go through the feature index.ts.',
            },
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
