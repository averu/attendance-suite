import { useMemo, useState } from 'react'
import { useSuspenseQuery } from '@tanstack/react-query'
import { Loader2, Save } from 'lucide-react'
import { toast } from 'sonner'
import { organizationQueries } from '../queries'
import { useUpdateMemberWorkProfile } from '../mutations'
import type { Member } from '../types'
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
import { Input } from '@/shared/ui/input'

type Row = {
  membershipId: string
  hireDate: string
  weeklyScheduledDays: string
  weeklyScheduledHours: string
}

function memberToRow(m: Member): Row {
  return {
    membershipId: m.membershipId,
    hireDate: m.hireDate ?? '',
    weeklyScheduledDays:
      m.weeklyScheduledDays == null ? '' : String(m.weeklyScheduledDays),
    weeklyScheduledHours:
      m.weeklyScheduledHours == null ? '' : String(m.weeklyScheduledHours),
  }
}

function rowEquals(a: Row, b: Row): boolean {
  return (
    a.hireDate === b.hireDate &&
    a.weeklyScheduledDays === b.weeklyScheduledDays &&
    a.weeklyScheduledHours === b.weeklyScheduledHours
  )
}

function parseRow(r: Row): {
  ok: true
  payload: {
    membershipId: string
    hireDate: string | null
    weeklyScheduledDays: number | null
    weeklyScheduledHours: number | null
  }
} | { ok: false; error: string } {
  const hireDate = r.hireDate === '' ? null : r.hireDate
  if (hireDate && !/^\d{4}-\d{2}-\d{2}$/.test(hireDate)) {
    return { ok: false, error: '雇入日は YYYY-MM-DD' }
  }
  const days = r.weeklyScheduledDays === '' ? null : Number(r.weeklyScheduledDays)
  if (days !== null && (Number.isNaN(days) || days < 0 || days > 7)) {
    return { ok: false, error: '週所定日数は 0-7' }
  }
  const hours =
    r.weeklyScheduledHours === '' ? null : Number(r.weeklyScheduledHours)
  if (hours !== null && (Number.isNaN(hours) || hours < 0 || hours > 168)) {
    return { ok: false, error: '週所定時間は 0-168' }
  }
  return {
    ok: true,
    payload: {
      membershipId: r.membershipId,
      hireDate,
      weeklyScheduledDays: days === null ? null : Math.floor(days),
      weeklyScheduledHours: hours,
    },
  }
}

/**
 * メンバー労務情報を一括編集する画面 (初期セットアップ用)。
 * - 各行で hireDate / weeklyDays / weeklyHours を編集
 * - 「変更を保存」で dirty な行だけを Promise.all で並列 mutate
 */
export function BulkMemberWorkProfileEditor() {
  const { data: members } = useSuspenseQuery(organizationQueries.members())
  const baseRows = useMemo(() => members.map(memberToRow), [members])
  const [rows, setRows] = useState<Row[]>(baseRows)
  const [saving, setSaving] = useState(false)
  const update = useUpdateMemberWorkProfile()

  // 既存メンバーが追加されたとき (招待受諾直後など) baseRows と同期
  // sync は意図的に "rows.length が異なる時のみ" にとどめて入力中の編集は維持
  if (rows.length !== baseRows.length) {
    setRows(baseRows)
  }

  function patch(idx: number, p: Partial<Row>) {
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, ...p } : r)))
  }

  const dirtyIndices = rows
    .map((r, i) => (rowEquals(r, baseRows[i]!) ? -1 : i))
    .filter((i) => i >= 0)

  async function onSaveAll() {
    if (dirtyIndices.length === 0) {
      toast.info('変更がありません')
      return
    }
    // 全行を事前にバリデーション。1 つでもエラーなら保存しない。
    const parsed = dirtyIndices.map((i) => ({ idx: i, r: parseRow(rows[i]!) }))
    const failed = parsed.find((p) => !p.r.ok)
    if (failed && !failed.r.ok) {
      const member = members[failed.idx]
      toast.error(`${member?.name ?? '行'}: ${failed.r.error}`)
      return
    }
    setSaving(true)
    let ok = 0
    let ng = 0
    await Promise.all(
      parsed.map(async (p) => {
        if (!p.r.ok) return
        try {
          await update.mutateAsync(p.r.payload)
          ok += 1
        } catch {
          ng += 1
        }
      }),
    )
    setSaving(false)
    if (ng === 0) toast.success(`${ok} 名の労務情報を保存しました`)
    else toast.error(`${ok} 名保存、${ng} 名失敗`)
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle>メンバー労務情報 (一括編集)</CardTitle>
            <CardDescription>
              雇入日と週所定 (日数・時間) を一括で入力します。空欄は未設定 (null) として保存。
            </CardDescription>
          </div>
          <Button
            type="button"
            disabled={saving || dirtyIndices.length === 0}
            onClick={onSaveAll}
          >
            {saving ? (
              <Loader2 className="animate-spin" />
            ) : (
              <Save className="size-4" />
            )}
            変更を保存 {dirtyIndices.length > 0 && `(${dirtyIndices.length})`}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>メンバー</TableHead>
              <TableHead className="w-44">雇入日</TableHead>
              <TableHead className="w-28">週所定日数</TableHead>
              <TableHead className="w-32">週所定時間</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.map((m, idx) => {
              const r = rows[idx]!
              const dirty = !rowEquals(r, baseRows[idx]!)
              return (
                <TableRow
                  key={m.membershipId}
                  className={dirty ? 'bg-amber-50 dark:bg-amber-950/20' : ''}
                >
                  <TableCell>
                    <div className="font-medium">{m.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {m.email}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Input
                      type="date"
                      value={r.hireDate}
                      onChange={(e) => patch(idx, { hireDate: e.target.value })}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min={0}
                      max={7}
                      step={1}
                      placeholder="5"
                      value={r.weeklyScheduledDays}
                      onChange={(e) =>
                        patch(idx, { weeklyScheduledDays: e.target.value })
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min={0}
                      max={168}
                      step={0.5}
                      placeholder="40"
                      value={r.weeklyScheduledHours}
                      onChange={(e) =>
                        patch(idx, { weeklyScheduledHours: e.target.value })
                      }
                    />
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
