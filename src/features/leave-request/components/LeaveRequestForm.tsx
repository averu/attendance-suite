import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useCreateLeaveRequest } from '../mutations'
import { LEAVE_TYPE_LABEL, type LeaveType } from '../types'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select'
import { Alert, AlertDescription } from '@/shared/ui/alert'
import { today } from '@/shared/lib/datetime'

export function LeaveRequestForm() {
  const navigate = useNavigate()
  const create = useCreateLeaveRequest()
  const [leaveType, setLeaveType] = useState<LeaveType>('paid_full')
  const [startDate, setStartDate] = useState(today())
  const [endDate, setEndDate] = useState(today())
  const [reason, setReason] = useState('')

  const isHalf = leaveType === 'paid_half_am' || leaveType === 'paid_half_pm'

  function onTypeChange(v: LeaveType) {
    setLeaveType(v)
    if (v === 'paid_half_am' || v === 'paid_half_pm') {
      setEndDate(startDate) // 半休は単日に揃える
    }
  }

  function onStartChange(v: string) {
    setStartDate(v)
    if (isHalf || endDate < v) setEndDate(v)
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    try {
      await create.mutateAsync({
        leaveType,
        startDate,
        endDate: isHalf ? startDate : endDate,
        reason,
      })
      toast.success('休暇を申請しました')
      await navigate({ to: '/leaves' })
    } catch (err) {
      toast.error((err as Error).message)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>休暇申請</CardTitle>
        <CardDescription>
          有給・半休・特別休暇等を申請します。マネージャーが承認後に確定します。
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="grid gap-4 max-w-md">
          <div className="grid gap-2">
            <Label htmlFor="leaveType">種別</Label>
            <Select value={leaveType} onValueChange={(v) => onTypeChange(v as LeaveType)}>
              <SelectTrigger id="leaveType" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(LEAVE_TYPE_LABEL) as LeaveType[]).map((t) => (
                  <SelectItem key={t} value={t}>
                    {LEAVE_TYPE_LABEL[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="startDate">開始日</Label>
              <Input
                id="startDate"
                type="date"
                required
                value={startDate}
                onChange={(e) => onStartChange(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="endDate">
                終了日 {isHalf && '(半休なので単日)'}
              </Label>
              <Input
                id="endDate"
                type="date"
                required
                disabled={isHalf}
                value={isHalf ? startDate : endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={startDate}
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="reason">理由</Label>
            <Textarea
              id="reason"
              required
              rows={3}
              placeholder="例: 私用のため"
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
