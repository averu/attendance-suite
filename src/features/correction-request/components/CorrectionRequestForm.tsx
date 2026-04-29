import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Loader2, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { useCreateCorrectionRequest } from '../mutations'
import type { CorrectionRequestType, ProposedBreak } from '../types'
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
import { Textarea } from '@/shared/ui/textarea'
import { Alert, AlertDescription } from '@/shared/ui/alert'

function toIsoOrNull(date: string, time: string): string | null {
  if (!time) return null
  return new Date(`${date}T${time}:00+09:00`).toISOString()
}

type BreakRow = { startTime: string; endTime: string }

// state の break 行を proposedBreaks (API 型) に変換する。
// - startTime 空 → 行ごと無視 (UI でまだ入力していない空行を許容)
// - endTime 空 → endAt は null を送る (まだ休憩中 / 終了未定の表現)
function toProposedBreaks(date: string, rows: BreakRow[]): ProposedBreak[] | null {
  const out: ProposedBreak[] = []
  for (const r of rows) {
    if (!r.startTime) continue
    const startAt = toIsoOrNull(date, r.startTime)
    if (!startAt) continue
    out.push({ startAt, endAt: toIsoOrNull(date, r.endTime) })
  }
  return out.length > 0 ? out : null
}

export function CorrectionRequestForm({ defaultDate }: { defaultDate: string }) {
  const navigate = useNavigate()
  const create = useCreateCorrectionRequest()
  const [targetDate, setTargetDate] = useState(defaultDate)
  const [requestType, setRequestType] = useState<CorrectionRequestType>('edit')
  const [clockIn, setClockIn] = useState('')
  const [clockOut, setClockOut] = useState('')
  const [breaks, setBreaks] = useState<BreakRow[]>([])
  const [reason, setReason] = useState('')
  const isDelete = requestType === 'delete'

  function addBreak() {
    setBreaks((prev) => [...prev, { startTime: '', endTime: '' }])
  }
  function removeBreak(idx: number) {
    setBreaks((prev) => prev.filter((_, i) => i !== idx))
  }
  function updateBreak(idx: number, patch: Partial<BreakRow>) {
    setBreaks((prev) =>
      prev.map((row, i) => (i === idx ? { ...row, ...patch } : row)),
    )
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    try {
      await create.mutateAsync({
        targetDate,
        requestType,
        // delete 申請は提案値を送らない
        proposedClockInAt: isDelete ? null : toIsoOrNull(targetDate, clockIn),
        proposedClockOutAt: isDelete ? null : toIsoOrNull(targetDate, clockOut),
        proposedBreaks: isDelete ? null : toProposedBreaks(targetDate, breaks),
        reason,
      })
      toast.success('申請を送信しました')
      await navigate({ to: '/requests' })
    } catch (err) {
      toast.error((err as Error).message)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>修正申請</CardTitle>
        <CardDescription>
          打刻ミス等の修正、または休日に誤打刻した分の取り消しを申請できます
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="grid gap-4 max-w-md">
          <div className="grid gap-2">
            <Label>申請の種別</Label>
            <div className="flex items-center gap-4 text-sm">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="request-type"
                  value="edit"
                  checked={requestType === 'edit'}
                  onChange={() => setRequestType('edit')}
                />
                修正 (時刻を変更)
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="request-type"
                  value="delete"
                  checked={requestType === 'delete'}
                  onChange={() => setRequestType('delete')}
                />
                削除 (打刻自体を取り消し)
              </label>
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="targetDate">対象日</Label>
            <Input
              id="targetDate"
              type="date"
              required
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
            />
          </div>
          {!isDelete && (
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label htmlFor="clockIn">出勤希望時刻</Label>
                <Input
                  id="clockIn"
                  type="time"
                  value={clockIn}
                  onChange={(e) => setClockIn(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="clockOut">退勤希望時刻</Label>
                <Input
                  id="clockOut"
                  type="time"
                  value={clockOut}
                  onChange={(e) => setClockOut(e.target.value)}
                />
              </div>
            </div>
          )}
          {!isDelete && (
          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <Label>休憩希望</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addBreak}
              >
                <Plus className="size-4" />
                追加
              </Button>
            </div>
            {breaks.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                休憩がない場合は空のままでも申請できます
              </p>
            ) : (
              <ul className="grid gap-2">
                {breaks.map((row, idx) => (
                  <li
                    key={idx}
                    className="grid grid-cols-[1fr_1fr_auto] gap-2 items-end"
                  >
                    <div className="grid gap-1">
                      <Label
                        htmlFor={`break-start-${idx}`}
                        className="text-xs text-muted-foreground"
                      >
                        開始
                      </Label>
                      <Input
                        id={`break-start-${idx}`}
                        type="time"
                        value={row.startTime}
                        onChange={(e) =>
                          updateBreak(idx, { startTime: e.target.value })
                        }
                      />
                    </div>
                    <div className="grid gap-1">
                      <Label
                        htmlFor={`break-end-${idx}`}
                        className="text-xs text-muted-foreground"
                      >
                        終了
                      </Label>
                      <Input
                        id={`break-end-${idx}`}
                        type="time"
                        value={row.endTime}
                        onChange={(e) =>
                          updateBreak(idx, { endTime: e.target.value })
                        }
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={`休憩 ${idx + 1} を削除`}
                      onClick={() => removeBreak(idx)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          )}
          <div className="grid gap-2">
            <Label htmlFor="reason">理由</Label>
            <Textarea
              id="reason"
              required
              rows={3}
              placeholder={
                isDelete
                  ? '例: 休日に誤って出勤打刻したため取り消したい'
                  : '例: 出勤打刻を忘れたため'
              }
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
          {create.error && (
            <Alert variant="destructive">
              <AlertDescription>{(create.error as Error).message}</AlertDescription>
            </Alert>
          )}
          <Button type="submit" disabled={create.isPending}>
            {create.isPending && <Loader2 className="animate-spin" />}
            申請する
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
