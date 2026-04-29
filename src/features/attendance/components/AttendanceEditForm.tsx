import { useState } from 'react'
import { Loader2, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { useDeleteAttendanceEntry, useEditAttendanceEntry } from '../mutations'
import type { TimeEntry } from '../types'
import { Button } from '@/shared/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/ui/card'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import { Textarea } from '@/shared/ui/textarea'
import { Alert, AlertDescription } from '@/shared/ui/alert'
import { Separator } from '@/shared/ui/separator'

const JST_OFFSET = '+09:00'

function timeFromIso(iso: string | null): string {
  if (!iso) return ''
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Tokyo',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(iso))
}

function timeToIso(date: string, time: string): string | null {
  if (!time) return null
  return new Date(`${date}T${time}:00${JST_OFFSET}`).toISOString()
}

type BreakRow = { startAt: string; endAt: string } // HH:mm 形式

export function AttendanceEditForm({
  userId,
  workDate,
  initialEntry,
  onSuccess,
}: {
  userId: string
  workDate: string
  initialEntry: TimeEntry | null
  onSuccess?: () => void
}) {
  const edit = useEditAttendanceEntry()
  const del = useDeleteAttendanceEntry()
  const [clockIn, setClockIn] = useState(timeFromIso(initialEntry?.clockInAt ?? null))
  const [clockOut, setClockOut] = useState(
    timeFromIso(initialEntry?.clockOutAt ?? null),
  )
  // note は今回の編集に対するメモなので毎回空から開始する (TimeEntry DTO に既存 note は載っていない)
  const [note, setNote] = useState('')
  const [breakRows, setBreakRows] = useState<BreakRow[]>(
    (initialEntry?.breaks ?? [])
      .filter((b) => b.endAt)
      .map((b) => ({
        startAt: timeFromIso(b.startAt),
        endAt: timeFromIso(b.endAt),
      })),
  )

  function addBreak() {
    setBreakRows((rs) => [...rs, { startAt: '', endAt: '' }])
  }
  function removeBreak(idx: number) {
    setBreakRows((rs) => rs.filter((_, i) => i !== idx))
  }
  function updateBreak(idx: number, field: 'startAt' | 'endAt', value: string) {
    setBreakRows((rs) =>
      rs.map((r, i) => (i === idx ? { ...r, [field]: value } : r)),
    )
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    const cleanBreaks = breakRows.filter((b) => b.startAt && b.endAt)
    try {
      await edit.mutateAsync({
        userId,
        workDate,
        clockInAt: timeToIso(workDate, clockIn),
        clockOutAt: timeToIso(workDate, clockOut),
        breaks: cleanBreaks.map((b) => ({
          startAt: timeToIso(workDate, b.startAt) as string,
          endAt: timeToIso(workDate, b.endAt) as string,
        })),
        note: note || undefined,
      })
      toast.success('勤怠を更新しました')
      onSuccess?.()
    } catch (err) {
      toast.error((err as Error).message)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>直接編集</CardTitle>
        <CardDescription>
          管理者権限による即時反映。修正申請のレビュー履歴は残りません。
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="grid gap-4">
          <div className="grid grid-cols-2 gap-3 max-w-md">
            <div className="grid gap-2">
              <Label htmlFor="edit-clockIn">出勤時刻</Label>
              <Input
                id="edit-clockIn"
                type="time"
                value={clockIn}
                onChange={(e) => setClockIn(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-clockOut">退勤時刻</Label>
              <Input
                id="edit-clockOut"
                type="time"
                value={clockOut}
                onChange={(e) => setClockOut(e.target.value)}
              />
            </div>
          </div>

          <Separator />

          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <Label>休憩</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addBreak}
              >
                <Plus />
                行を追加
              </Button>
            </div>
            {breakRows.length === 0 ? (
              <p className="text-muted-foreground text-sm">休憩なし</p>
            ) : (
              <ul className="grid gap-2">
                {breakRows.map((b, i) => (
                  <li
                    key={i}
                    className="grid grid-cols-[1fr_1fr_auto] items-center gap-2 max-w-md"
                  >
                    <Input
                      type="time"
                      value={b.startAt}
                      onChange={(e) => updateBreak(i, 'startAt', e.target.value)}
                      placeholder="開始"
                    />
                    <Input
                      type="time"
                      value={b.endAt}
                      onChange={(e) => updateBreak(i, 'endAt', e.target.value)}
                      placeholder="終了"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeBreak(i)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <Separator />

          <div className="grid gap-2 max-w-md">
            <Label htmlFor="edit-note">本人へのメモ (任意)</Label>
            <Textarea
              id="edit-note"
              rows={2}
              placeholder="例: タイムカード故障により管理者修正"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>

          {edit.error && (
            <Alert variant="destructive">
              <AlertDescription>{(edit.error as Error).message}</AlertDescription>
            </Alert>
          )}

          <div className="flex items-center gap-2">
            <Button type="submit" disabled={edit.isPending || del.isPending}>
              {edit.isPending && <Loader2 className="animate-spin" />}
              更新を保存
            </Button>
            {initialEntry?.id && (
              <Button
                type="button"
                variant="destructive"
                disabled={edit.isPending || del.isPending}
                onClick={() => {
                  if (
                    !confirm(
                      `${workDate} の打刻を削除しますか？ (この操作は監査ログに残ります)`,
                    )
                  )
                    return
                  del.mutate(
                    { userId, workDate },
                    {
                      onSuccess: () => {
                        toast.success('削除しました')
                        onSuccess?.()
                      },
                      onError: (e) => toast.error((e as Error).message),
                    },
                  )
                }}
              >
                {del.isPending ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <Trash2 className="size-4" />
                )}
                1 日分を削除
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
