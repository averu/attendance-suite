import { useState } from 'react'
import { useSuspenseQuery } from '@tanstack/react-query'
import { Copy, Loader2, Send } from 'lucide-react'
import { toast } from 'sonner'
import { useInviteMember } from '../mutations'
import { organizationQueries } from '../queries'
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
  const { data: invitations } = useSuspenseQuery(organizationQueries.invitations())

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
        </CardHeader>
        <CardContent>
          {invitations.length === 0 ? (
            <p className="text-muted-foreground text-sm">なし</p>
          ) : (
            <ul className="grid gap-2 text-sm">
              {invitations.map((i) => (
                <li
                  key={i.id}
                  className="flex items-center justify-between border rounded-md p-3"
                >
                  <span>{i.email}</span>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{i.role}</Badge>
                    <span className="text-muted-foreground text-xs">
                      {new Date(i.expiresAt).toLocaleDateString('ja-JP')} まで
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
