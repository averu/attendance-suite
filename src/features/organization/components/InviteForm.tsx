import { useMemo, useState } from 'react'
import { useSuspenseQuery } from '@tanstack/react-query'
import { AlertTriangle, Copy, Loader2, Send, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { useInviteMember, useRevokeInvitation } from '../mutations'
import { organizationQueries } from '../queries'
import { categorizeInvitations } from '../categorizeInvitations'
import type { CategorizedInvitation } from '../categorizeInvitations'
import type { InviteRole } from '../types'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/ui/card'
import { Alert, AlertDescription } from '@/shared/ui/alert'
import { Badge } from '@/shared/ui/badge'

export function InviteForm() {
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<InviteRole>('member')
  const [issued, setIssued] = useState<string | null>(null)
  const invite = useInviteMember()
  const revoke = useRevokeInvitation()
  const { data: invitations } = useSuspenseQuery(organizationQueries.invitations())

  // 招待リストを期限基準で active / expired に分類。daysRemaining 等も付与される。
  const { active, expired } = useMemo(
    () => categorizeInvitations(invitations),
    [invitations],
  )

  function copyInviteUrl(token: string) {
    const url = `${window.location.origin}/invite/${token}`
    navigator.clipboard.writeText(url)
    toast.success('リンクをコピーしました')
  }

  function onRevoke(invitationId: string, email: string) {
    if (!confirm(`${email} 宛の招待を削除しますか？`)) return
    revoke.mutate(
      { invitationId },
      {
        onSuccess: () => toast.success('招待を削除しました'),
        onError: (e) => toast.error((e as Error).message),
      },
    )
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIssued(null)
    try {
      const res = await invite.mutateAsync({ email, role })
      const url = `${window.location.origin}/invite/${res.token}`
      setIssued(url)
      setEmail('')
      toast.success('招待リンクを発行しました')
    } catch (err) {
      toast.error((err as Error).message)
    }
  }

  function copy() {
    if (issued) {
      navigator.clipboard.writeText(issued)
      toast.success('リンクをコピーしました')
    }
  }

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>招待</CardTitle>
          <CardDescription>
            メンバーを招待するリンクを発行します
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="grid gap-4">
            <div className="grid sm:grid-cols-[1fr_140px_auto] gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="invite-email">Email</Label>
                <Input
                  id="invite-email"
                  type="email"
                  required
                  placeholder="member@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="invite-role">Role</Label>
                <Select value={role} onValueChange={(v) => setRole(v as InviteRole)}>
                  <SelectTrigger id="invite-role" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="member">member</SelectItem>
                    <SelectItem value="admin">admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label className="invisible">.</Label>
                <Button type="submit" disabled={invite.isPending}>
                  {invite.isPending ? (
                    <Loader2 className="animate-spin" />
                  ) : (
                    <Send />
                  )}
                  発行
                </Button>
              </div>
            </div>
            {issued && (
              <Alert>
                <AlertDescription className="grid gap-2">
                  <span className="text-sm">
                    招待リンクをコピーして共有してください：
                  </span>
                  <div className="flex items-center gap-2">
                    <code className="bg-muted text-xs p-2 rounded flex-1 break-all">
                      {issued}
                    </code>
                    <Button type="button" size="icon" variant="outline" onClick={copy}>
                      <Copy className="size-4" />
                    </Button>
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>未受諾の招待</CardTitle>
          <CardDescription>
            送信済みの招待リンクを再表示・コピー・削除できます
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          {active.length === 0 && expired.length === 0 ? (
            <p className="text-muted-foreground text-sm">なし</p>
          ) : (
            <>
              {active.length > 0 && (
                <ul className="grid gap-2 text-sm">
                  {active.map((i) => (
                    <InvitationRow
                      key={i.id}
                      invitation={i}
                      onCopy={() => copyInviteUrl(i.token)}
                      onRevoke={() => onRevoke(i.id, i.email)}
                      revokePending={revoke.isPending}
                    />
                  ))}
                </ul>
              )}
              {expired.length > 0 && (
                <div className="grid gap-2">
                  <h4 className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                    <AlertTriangle className="size-3.5" />
                    期限切れ ({expired.length})
                  </h4>
                  <ul className="grid gap-2 text-sm">
                    {expired.map((i) => (
                      <InvitationRow
                        key={i.id}
                        invitation={i}
                        onCopy={() => copyInviteUrl(i.token)}
                        onRevoke={() => onRevoke(i.id, i.email)}
                        revokePending={revoke.isPending}
                      />
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function InvitationRow({
  invitation: i,
  onCopy,
  onRevoke,
  revokePending,
}: {
  invitation: CategorizedInvitation
  onCopy: () => void
  onRevoke: () => void
  revokePending: boolean
}) {
  const dateLabel = new Date(i.expiresAt).toLocaleDateString('ja-JP')
  const remainingLabel = i.isExpired
    ? '期限切れ'
    : i.daysRemaining <= 1
      ? '本日中'
      : `あと ${i.daysRemaining} 日`
  return (
    <li
      className={
        'flex flex-wrap items-center justify-between gap-2 border rounded-md p-3 ' +
        (i.isExpired ? 'border-destructive/40 bg-destructive/5' : '')
      }
    >
      <div className="flex items-center gap-2 min-w-0">
        <span className="truncate">{i.email}</span>
        <Badge variant={i.isExpired ? 'destructive' : 'outline'}>
          {i.role}
        </Badge>
      </div>
      <div className="flex items-center gap-2">
        <span
          className={
            'text-xs ' +
            (i.isExpired ? 'text-destructive' : 'text-muted-foreground')
          }
          title={`${dateLabel} まで`}
        >
          {remainingLabel}
        </span>
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label={`${i.email} 宛の招待リンクをコピー`}
          disabled={i.isExpired}
          onClick={onCopy}
        >
          <Copy className="size-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={`${i.email} 宛の招待を削除`}
          disabled={revokePending}
          onClick={onRevoke}
        >
          <Trash2 className="size-4" />
        </Button>
      </div>
    </li>
  )
}
