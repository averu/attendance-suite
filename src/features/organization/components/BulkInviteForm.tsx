import { useState } from 'react'
import { Copy, Loader2, Send } from 'lucide-react'
import { toast } from 'sonner'
import { useBulkInviteMembers } from '../mutations'
import type { BulkInviteResultItem } from '../mutations'
import type { InviteRole } from '../types'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/ui/card'
import { Button } from '@/shared/ui/button'
import { Textarea } from '@/shared/ui/textarea'
import { Label } from '@/shared/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select'
import { Badge } from '@/shared/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/ui/table'

const SKIP_LABEL: Record<NonNullable<BulkInviteResultItem['skipReason']>, string> = {
  ALREADY_MEMBER: '既にメンバー',
  INVITATION_PENDING: '有効な招待が既存',
}

// 改行 / カンマ / 空白 区切りで email を抽出。空要素は除外。
function parseEmails(raw: string): string[] {
  return raw
    .split(/[\s,]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
}

/**
 * 複数 email を改行 or カンマ区切りで入力 → 一括で招待リンクを発行する。
 * 既存メンバーや未受諾の有効な招待がある email は skip して結果に含める。
 */
export function BulkInviteForm() {
  const [text, setText] = useState('')
  const [role, setRole] = useState<InviteRole>('member')
  const [results, setResults] = useState<BulkInviteResultItem[] | null>(null)
  const bulk = useBulkInviteMembers()

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    const emails = parseEmails(text)
    if (emails.length === 0) {
      toast.error('email を 1 件以上入力してください')
      return
    }
    if (emails.length > 100) {
      toast.error('一度に 100 件まで')
      return
    }
    try {
      const r = await bulk.mutateAsync({ emails, role })
      setResults(r.items)
      const inv = r.items.filter((i) => i.status === 'invited').length
      const skip = r.items.filter((i) => i.status === 'skipped').length
      toast.success(`${inv} 件発行${skip > 0 ? `、${skip} 件 skip` : ''}`)
    } catch (err) {
      toast.error((err as Error).message)
    }
  }

  function copy(token: string) {
    const url = `${window.location.origin}/invite/${token}`
    navigator.clipboard.writeText(url)
    toast.success('リンクをコピーしました')
  }

  function copyAll(items: BulkInviteResultItem[]) {
    const lines = items
      .filter((i) => i.status === 'invited' && i.token)
      .map((i) => `${i.email}\t${window.location.origin}/invite/${i.token}`)
      .join('\n')
    if (lines) {
      navigator.clipboard.writeText(lines)
      toast.success('発行された全リンクをコピーしました')
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>一括招待</CardTitle>
        <CardDescription>
          複数 email を改行・カンマ・空白区切りで入力 (最大 100 件)。重複や既存メンバーは skip されます。
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <form onSubmit={onSubmit} className="grid gap-3">
          <div className="grid gap-2">
            <Label htmlFor="bulk-emails">Email リスト</Label>
            <Textarea
              id="bulk-emails"
              rows={6}
              placeholder={'a@example.com\nb@example.com\nc@example.com'}
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              現在 {parseEmails(text).length} 件
            </p>
          </div>
          <div className="grid sm:grid-cols-[140px_auto_1fr] gap-3 items-end">
            <div className="grid gap-1.5">
              <Label htmlFor="bulk-role">Role</Label>
              <Select value={role} onValueChange={(v) => setRole(v as InviteRole)}>
                <SelectTrigger id="bulk-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="member">member</SelectItem>
                  <SelectItem value="admin">admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" disabled={bulk.isPending}>
              {bulk.isPending ? (
                <Loader2 className="animate-spin" />
              ) : (
                <Send className="size-4" />
              )}
              一括発行
            </Button>
          </div>
        </form>

        {results && results.length > 0 && (
          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium">結果</h4>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => copyAll(results)}
              >
                <Copy className="size-3.5" />
                全リンクをコピー
              </Button>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>状態</TableHead>
                  <TableHead>招待リンク / 理由</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {results.map((r) => (
                  <TableRow key={r.email}>
                    <TableCell className="font-medium">{r.email}</TableCell>
                    <TableCell>
                      {r.status === 'invited' ? (
                        <Badge variant="secondary">発行</Badge>
                      ) : (
                        <Badge variant="outline">skip</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-xs">
                      {r.status === 'invited' && r.token ? (
                        <code className="bg-muted px-1.5 py-0.5 rounded break-all">
                          /invite/{r.token.slice(0, 12)}…
                        </code>
                      ) : r.skipReason ? (
                        <span className="text-muted-foreground">
                          {SKIP_LABEL[r.skipReason]}
                        </span>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      {r.status === 'invited' && r.token && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label={`${r.email} の招待リンクをコピー`}
                          onClick={() => copy(r.token!)}
                        >
                          <Copy className="size-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
