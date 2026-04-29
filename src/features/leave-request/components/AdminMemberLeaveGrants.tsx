import { useState } from 'react'
import { useSuspenseQuery } from '@tanstack/react-query'
import { Loader2, Plus, RefreshCw, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { leaveRequestQueries } from '../queries'
import {
  useAddLeaveGrant,
  useRemoveLeaveGrant,
  useSyncAutoLeaveGrants,
} from '../mutations'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/ui/table'
import { Button } from '@/shared/ui/button'
import { Badge } from '@/shared/ui/badge'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'

/**
 * 管理者用: 1 メンバーの有給付与履歴を一覧・追加・削除する Card。
 * 「自動同期」を押すと雇入日 + 表参照で auto 付与を補完。
 * 手動付与は繰越分や入社前在職の調整など初期設定用途。
 */
export function AdminMemberLeaveGrants({
  userId,
  userName,
}: {
  userId: string
  userName: string
}) {
  const { data: grants } = useSuspenseQuery(
    leaveRequestQueries.memberGrants(userId),
  )
  const add = useAddLeaveGrant()
  const remove = useRemoveLeaveGrant()
  const sync = useSyncAutoLeaveGrants()

  const [grantDate, setGrantDate] = useState('')
  const [grantedDays, setGrantedDays] = useState('10')
  const [note, setNote] = useState('')

  async function onAdd(e: React.FormEvent) {
    e.preventDefault()
    const days = Number(grantedDays)
    if (!grantDate || Number.isNaN(days) || days <= 0) {
      toast.error('付与日と日数を確認してください')
      return
    }
    try {
      await add.mutateAsync({
        userId,
        grantDate,
        grantedDays: days,
        note: note || undefined,
      })
      toast.success('付与を登録しました')
      setGrantDate('')
      setNote('')
    } catch (err) {
      const code = (err as Error).message
      toast.error(
        code === 'GRANT_DATE_DUPLICATE'
          ? 'その付与日は既に登録されています'
          : code,
      )
    }
  }

  function onRemove(grantId: string, label: string) {
    if (!confirm(`${label} を削除しますか？`)) return
    remove.mutate(
      { grantId },
      {
        onSuccess: () => toast.success('削除しました'),
        onError: (e) => toast.error((e as Error).message),
      },
    )
  }

  function onSync() {
    sync.mutate(
      { userId },
      {
        onSuccess: (r) =>
          toast.success(
            r.syncedCount > 0
              ? `${r.syncedCount} 件の自動付与を生成しました`
              : '追加すべき自動付与はありません',
          ),
        onError: (e) => toast.error((e as Error).message),
      },
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle>有給付与履歴</CardTitle>
            <CardDescription>
              {userName} の付与一覧。手動付与は繰越分や初期設定用途。
              「自動同期」で雇入日 + 表参照を再計算します。
            </CardDescription>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={sync.isPending}
            onClick={onSync}
          >
            {sync.isPending ? (
              <Loader2 className="animate-spin" />
            ) : (
              <RefreshCw className="size-4" />
            )}
            自動同期
          </Button>
        </div>
      </CardHeader>
      <CardContent className="grid gap-6">
        <form onSubmit={onAdd} className="grid gap-3">
          <div className="grid sm:grid-cols-[1fr_120px_1fr_auto] gap-3 items-end">
            <div className="grid gap-1.5">
              <Label htmlFor={`grant-date-${userId}`}>付与日</Label>
              <Input
                id={`grant-date-${userId}`}
                type="date"
                required
                value={grantDate}
                onChange={(e) => setGrantDate(e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor={`grant-days-${userId}`}>日数</Label>
              <Input
                id={`grant-days-${userId}`}
                type="number"
                min={0.5}
                max={99}
                step={0.5}
                required
                value={grantedDays}
                onChange={(e) => setGrantedDays(e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor={`grant-note-${userId}`}>メモ (任意)</Label>
              <Input
                id={`grant-note-${userId}`}
                placeholder="例: システム導入前の繰越"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>
            <Button type="submit" disabled={add.isPending}>
              {add.isPending ? (
                <Loader2 className="animate-spin" />
              ) : (
                <Plus className="size-4" />
              )}
              手動付与
            </Button>
          </div>
        </form>

        {grants.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            付与履歴はまだありません
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>付与日</TableHead>
                <TableHead className="text-right">日数</TableHead>
                <TableHead>種別</TableHead>
                <TableHead>メモ</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {grants.map((g) => (
                <TableRow key={g.id}>
                  <TableCell className="font-mono">{g.grantDate}</TableCell>
                  <TableCell className="text-right font-mono">
                    {g.grantedDays}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={g.source === 'manual' ? 'default' : 'secondary'}
                    >
                      {g.source === 'manual' ? '手動' : '自動'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {g.note ?? '-'}
                  </TableCell>
                  <TableCell>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={`${g.grantDate} の付与を削除`}
                      disabled={remove.isPending}
                      onClick={() =>
                        onRemove(g.id, `${g.grantDate} ${g.grantedDays} 日`)
                      }
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
