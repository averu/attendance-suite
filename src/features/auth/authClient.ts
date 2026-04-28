import { createAuthClient } from 'better-auth/react'
import { publicEnv } from '@/shared/config/env.public'

export const authClient = createAuthClient({
  baseURL: publicEnv.VITE_PUBLIC_APP_URL,
})
