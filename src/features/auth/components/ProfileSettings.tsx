import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'
import { authClient } from '../authClient'
import { useSession } from '../hooks/useSession'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/ui/card'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import { Alert, AlertDescription } from '@/shared/ui/alert'

export function ProfileSettings() {
  const session = useSession()
  const qc = useQueryClient()
  const user = session.data.user

  const [name, setName] = useState(user?.name ?? '')
  const [namePending, setNamePending] = useState(false)
  const [nameError, setNameError] = useState<string | null>(null)

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [pwPending, setPwPending] = useState(false)
  const [pwError, setPwError] = useState<string | null>(null)

  if (!user) return <p>ユーザー情報が見つかりません。</p>

  async function onSaveName(e: React.FormEvent) {
    e.preventDefault()
    setNameError(null)
    setNamePending(true)
    try {
      const res = await authClient.updateUser({ name })
      if (res.error) {
        setNameError(res.error.message ?? '更新に失敗しました')
        return
      }
      qc.invalidateQueries({ queryKey: ['auth', 'session'] })
      toast.success('名前を更新しました')
    } finally {
      setNamePending(false)
    }
  }

  async function onChangePassword(e: React.FormEvent) {
    e.preventDefault()
    setPwError(null)
    setPwPending(true)
    try {
      const res = await authClient.changePassword({
        currentPassword,
        newPassword,
      })
      if (res.error) {
        setPwError(res.error.message ?? 'パスワード変更に失敗しました')
        return
      }
      setCurrentPassword('')
      setNewPassword('')
      toast.success('パスワードを更新しました')
    } finally {
      setPwPending(false)
    }
  }

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>基本情報</CardTitle>
          <CardDescription>名前を変更できます。Email は変更不可。</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSaveName} className="grid gap-4 max-w-md">
            <div className="grid gap-2">
              <Label>Email</Label>
              <Input value={user.email} disabled />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="profile-name">名前</Label>
              <Input
                id="profile-name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            {nameError && (
              <Alert variant="destructive">
                <AlertDescription>{nameError}</AlertDescription>
              </Alert>
            )}
            <Button type="submit" disabled={namePending || name === user.name}>
              {namePending && <Loader2 className="animate-spin" />}
              保存
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>パスワード変更</CardTitle>
          <CardDescription>現在のパスワードと新しいパスワードを入力</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onChangePassword} className="grid gap-4 max-w-md">
            <div className="grid gap-2">
              <Label htmlFor="cur-pw">現在のパスワード</Label>
              <Input
                id="cur-pw"
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="new-pw">新しいパスワード (8 文字以上)</Label>
              <Input
                id="new-pw"
                type="password"
                required
                minLength={8}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
              />
            </div>
            {pwError && (
              <Alert variant="destructive">
                <AlertDescription>{pwError}</AlertDescription>
              </Alert>
            )}
            <Button type="submit" disabled={pwPending}>
              {pwPending && <Loader2 className="animate-spin" />}
              パスワードを変更
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
