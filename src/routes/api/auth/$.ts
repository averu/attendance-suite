import { createFileRoute } from '@tanstack/react-router'
import { auth } from '@/features/auth/server/auth.server'

// Better Auth catch-all。GET/POST/ANY を auth.handler に委譲。
export const Route = createFileRoute('/api/auth/$')({
  server: {
    handlers: {
      ANY: ({ request }) => auth.handler(request),
    },
  },
})
