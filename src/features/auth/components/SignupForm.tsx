import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useQueryClient } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { authClient } from '../authClient'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import { Alert, AlertDescription } from '@/shared/ui/alert'

type SignupMode = 'bootstrap' | 'invite'

export function SignupForm({
  redirectTo = '/dashboard',
  mode = 'bootstrap',
}: {
  redirectTo?: string
  mode?: SignupMode
}) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [organizationName, setOrganizationName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setPending(true)
    try {
      const signUp = await authClient.signUp.email({ email, password, name })
      if (signUp.error) {
        setError(signUp.error.message ?? 'サインアップに失敗しました')
        return
      }
      // 招待モードでは bootstrap-org を呼ばない。受諾画面 (/invite/$token) で
      // 既存組織への参加処理に入る。組織作成はオーナー側のフローでのみ走る。
      if (mode === 'bootstrap') {
        const orgRes = await fetch('/api/bootstrap-org', {
          method: 'POST',
          credentials: 'include',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ name: organizationName }),
        })
        if (!orgRes.ok) {
          const body = await orgRes.json().catch(() => ({}))
          setError(body.error ?? '組織の作成に失敗しました')
          return
        }
      }
      // signUp.email 直後は session cookie だけ立っていて authQueries.session のキャッシュは
      // まだ user:null のまま。次の navigation で beforeLoad が cache hit してしまうと
      // /invite/$token が「未ログイン」と誤判定して /signup に戻る無限ループになる。
      await queryClient.invalidateQueries({ queryKey: ['auth', 'session'] })
      await navigate({ to: redirectTo })
    } finally {
      setPending(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor="name">名前</Label>
        <Input
          id="name"
          required
          autoComplete="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <p className="text-xs text-muted-foreground">8 文字以上</p>
      </div>
      {mode === 'bootstrap' && (
        <div className="grid gap-2">
          <Label htmlFor="organizationName">組織名</Label>
          <Input
            id="organizationName"
            required
            placeholder="例: ACME 株式会社"
            value={organizationName}
            onChange={(e) => setOrganizationName(e.target.value)}
          />
        </div>
      )}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <Button type="submit" disabled={pending} className="w-full">
        {pending && <Loader2 className="animate-spin" />}
        アカウントを作成
      </Button>
    </form>
  )
}
