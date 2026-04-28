import { toast } from 'sonner'
import { Coffee, LogIn, LogOut, Play } from 'lucide-react'
import { useBreakEnd, useBreakStart, useClockIn, useClockOut } from '../mutations'
import type { TimeEntryStatus } from '../types'
import { Button } from '@/shared/ui/button'

export function ClockButtons({ status }: { status: TimeEntryStatus }) {
  const clockIn = useClockIn()
  const clockOut = useClockOut()
  const breakStart = useBreakStart()
  const breakEnd = useBreakEnd()

  const pending =
    clockIn.isPending ||
    clockOut.isPending ||
    breakStart.isPending ||
    breakEnd.isPending

  function handle<T extends { mutate: () => void }>(m: T, label: string) {
    return () => {
      m.mutate()
      toast.success(label)
    }
  }

  if (status === 'finished') {
    return (
      <p className="text-muted-foreground text-sm">
        本日の勤務は終了済みです。
      </p>
    )
  }

  return (
    <div className="flex flex-wrap gap-2">
      {status === 'not_started' && (
        <Button disabled={pending} onClick={handle(clockIn, '出勤しました')}>
          <LogIn />
          出勤
        </Button>
      )}
      {status === 'working' && (
        <>
          <Button
            variant="secondary"
            disabled={pending}
            onClick={handle(breakStart, '休憩開始')}
          >
            <Coffee />
            休憩開始
          </Button>
          <Button
            variant="destructive"
            disabled={pending}
            onClick={handle(clockOut, '退勤しました')}
          >
            <LogOut />
            退勤
          </Button>
        </>
      )}
      {status === 'on_break' && (
        <Button disabled={pending} onClick={handle(breakEnd, '休憩終了')}>
          <Play />
          休憩終了
        </Button>
      )}
    </div>
  )
}
