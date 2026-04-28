import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useCreateCorrectionRequest } from '../mutations'
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

export function CorrectionRequestForm({ defaultDate }: { defaultDate: string }) {
  const navigate = useNavigate()
  const create = useCreateCorrectionRequest()
  const [targetDate, setTargetDate] = useState(defaultDate)
  const [clockIn, setClockIn] = useState('')
  const [clockOut, setClockOut] = useState('')
  const [reason, setReason] = useState('')

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    try {
      await create.mutateAsync({
        targetDate,
        proposedClockInAt: toIsoOrNull(targetDate, clockIn),
        proposedClockOutAt: toIsoOrNull(targetDate, clockOut),
        proposedBreaks: null,
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
          打刻ミス等の修正をマネージャーに申請します
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="grid gap-4 max-w-md">
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
          <div className="grid gap-2">
            <Label htmlFor="reason">理由</Label>
            <Textarea
              id="reason"
              required
              rows={3}
              placeholder="例: 出勤打刻を忘れたため"
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
