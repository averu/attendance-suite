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
    // multi-org サポート: 既に他の組織に所属していてもこの招待は別組織への参加として受諾可能
  },
  component: InviteScreen,
})

const ERROR_LABEL: Record<string, string> = {
  INVITATION_NOT_FOUND: '招待が見つかりません',
  INVITATION_ALREADY_ACCEPTED: 'この招待は既に受諾されています',
  INVITATION_EXPIRED: '招待の有効期限が切れています',
  INVITATION_EMAIL_MISMATCH:
    'この招待は別の Email 宛てです。正しいアカウントでサインインしてください',
  ALREADY_MEMBER: 'すでにこの組織のメンバーです',
  INVALID_INPUT: '入力に不備があります',
  UNAUTHORIZED: 'サインインしてからやり直してください',
}

function localizeError(code: string): string {
  return ERROR_LABEL[code] ?? `エラー: ${code}`
}

function InviteScreen() {
  const params = Route.useParams()
  const navigate = useNavigate()
  const accept = useAcceptInvitation()
  const [error, setError] = useState<string | null>(null)

  async function onAccept() {
    setError(null)
    try {
      await accept.mutateAsync({ token: params.token })
      // multi-org: 切替が必要なケースもあるので reload で session 取り直す
      await navigate({ to: '/dashboard', reloadDocument: true })
    } catch (e) {
      setError(localizeError((e as Error).message))
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
