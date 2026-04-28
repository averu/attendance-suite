import { createFileRoute, useNavigate, redirect } from '@tanstack/react-router'
import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { useAcceptInvitation } from '@/features/organization'
import { Button } from '@/shared/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/ui/card'
import { Alert, AlertDescription } from '@/shared/ui/alert'

export const Route = createFileRoute('/(public)/invite/$token')({
  beforeLoad: ({ context, location }) => {
    if (!context.auth.user) {
      throw redirect({
        to: '/signup',
        search: { redirect: location.href } as never,
      })
    }
    if (context.auth.membership) {
      throw redirect({ to: '/dashboard' })
    }
  },
  component: InviteScreen,
})

function InviteScreen() {
  const params = Route.useParams()
  const navigate = useNavigate()
  const accept = useAcceptInvitation()
  const [error, setError] = useState<string | null>(null)

  async function onAccept() {
    setError(null)
    try {
      await accept.mutateAsync({ token: params.token })
      await navigate({ to: '/dashboard' })
    } catch (e) {
      setError((e as Error).message)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>組織への招待</CardTitle>
          <CardDescription>
            このリンクを使って組織に参加できます
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <Button onClick={onAccept} disabled={accept.isPending}>
            {accept.isPending && <Loader2 className="animate-spin" />}
            組織に参加
          </Button>
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </main>
  )
}
