import { z } from 'zod'

// 公開 (server / client 両方で読む) env。VITE_PUBLIC_ プレフィクス必須。
// ファイル名を env.client.* にすると Start の import-protection が SSR import を拒否するので注意。

const PublicEnv = z.object({
  VITE_PUBLIC_APP_NAME: z.string().default('attendance'),
  VITE_PUBLIC_APP_URL: z.string().url().default('http://localhost:3000'),
})

export const publicEnv = PublicEnv.parse({
  VITE_PUBLIC_APP_NAME: import.meta.env.VITE_PUBLIC_APP_NAME,
  VITE_PUBLIC_APP_URL: import.meta.env.VITE_PUBLIC_APP_URL,
})

export type PublicEnv = z.infer<typeof PublicEnv>
