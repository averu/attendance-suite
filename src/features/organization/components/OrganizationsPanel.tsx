import { useState } from 'react'
import { Loader2, LogOut, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { useNavigate } from '@tanstack/react-router'
import { useSession } from '@/features/auth'
import { useCreateOrganization, useLeaveOrganization } from '../mutations'
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
import { Badge } from '@/shared/ui/badge'
import { Alert, AlertDescription } from '@/shared/ui/alert'

const LEAVE_ERROR_LABEL: Record<string, string> = {
  LAST_OWNER:
    'あなたはこの組織の唯一のオーナーです。先に他のメンバーをオーナーに昇格させてください。',
  NOT_MEMBER: 'この組織のメンバーではありません',
}

const CREATE_ERROR_LABEL: Record<string, string> = {
  FORBIDDEN_NOT_OWNER:
    '組織を作成できるのはオーナーのみです。所属組織のオーナーに依頼してください。',
}

export function OrganizationsPanel() {
  const session = useSession()
  const navigate = useNavigate()
  const orgs = session.data.availableOrganizations ?? []
  const activeOrgId = session.data.organization?.id
  // 組織作成は「どこかで owner」ロールを持つ場合のみ許可。
  // 既に member/admin としてのみ所属しているユーザは新組織を作れない (server も同じ判定)。
  const canCreateOrganization =
    orgs.length === 0 || orgs.some((o) => o.role === 'owner')

  const create = useCreateOrganization()
  const leave = useLeaveOrganization()

  const [newName, setNewName] = useState('')
  const [createError, setCreateError] = useState<string | null>(null)

  async function onCreate(e: React.FormEvent) {
    e.preventDefault()
    setCreateError(null)
    try {
      await create.mutateAsync({ name: newName })
      toast.success(`組織「${newName}」を作成しました`)
      setNewName('')
      // active organization が新組織に切り替わったので reload
      await navigate({ to: '/dashboard', reloadDocument: true })
    } catch (e) {
      const code = (e as Error).message
      setCreateError(CREATE_ERROR_LABEL[code] ?? code)
    }
  }

  async function onLeave(orgId: string, name: string) {
    if (!confirm(`組織「${name}」から脱退しますか？`)) return
    try {
      await leave.mutateAsync({ organizationId: orgId })
      toast.success(`「${name}」から脱退しました`)
      await navigate({ to: '/dashboard', reloadDocument: true })
    } catch (e) {
      const msg = (e as Error).message
      toast.error(LEAVE_ERROR_LABEL[msg] ?? `脱退に失敗しました: ${msg}`)
    }
  }

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>所属組織</CardTitle>
          <CardDescription>
            複数の組織に所属している場合はサイドバーから切替できます
          </CardDescription>
        </CardHeader>
        <CardContent>
          {orgs.length === 0 ? (
            <p className="text-muted-foreground text-sm">所属なし</p>
          ) : (
            <ul className="grid gap-2">
              {orgs.map((o) => (
                <li
                  key={o.id}
                  className="flex items-center justify-between border rounded-md px-3 py-2"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{o.name}</span>
                    <Badge variant="outline" className="capitalize">
                      {o.role}
                    </Badge>
                    {o.id === activeOrgId && (
                      <Badge variant="default">アクティブ</Badge>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={leave.isPending}
                    onClick={() => onLeave(o.id, o.name)}
                  >
                    <LogOut className="size-4" />
                    脱退
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {canCreateOrganization ? (
        <Card>
          <CardHeader>
            <CardTitle>新しい組織を作る</CardTitle>
            <CardDescription>
              自分が owner として新しい組織を作成。作成後はそれがアクティブ組織になります。
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={onCreate} className="grid gap-4 max-w-md">
              <div className="grid gap-2">
                <Label htmlFor="new-org-name">組織名</Label>
                <Input
                  id="new-org-name"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="例: 副業 LLC"
                />
              </div>
              {createError && (
                <Alert variant="destructive">
                  <AlertDescription>{createError}</AlertDescription>
                </Alert>
              )}
              <Button type="submit" disabled={create.isPending}>
                {create.isPending ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <Plus />
                )}
                作成
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>新しい組織を作る</CardTitle>
            <CardDescription>
              この機能は組織オーナーのみ利用できます。member / admin の方は所属する組織のオーナーに依頼してください。
            </CardDescription>
          </CardHeader>
        </Card>
      )}
    </div>
  )
}
