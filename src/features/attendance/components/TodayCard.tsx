import { useSuspenseQuery } from '@tanstack/react-query'
import { CalendarDays, Coffee, LogIn, LogOut } from 'lucide-react'
import { attendanceQueries } from '../queries'
import { formatTime } from '@/shared/lib/datetime'
import { ClockButtons } from './ClockButtons'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/ui/card'
import { Badge } from '@/shared/ui/badge'
import { Separator } from '@/shared/ui/separator'

const STATUS_LABEL: Record<string, string> = {
  not_started: '未出勤',
  working: '勤務中',
  on_break: '休憩中',
  finished: '退勤済',
}

const STATUS_VARIANT: Record<
  string,
  'default' | 'secondary' | 'destructive' | 'outline'
> = {
  not_started: 'outline',
  working: 'default',
  on_break: 'secondary',
  finished: 'secondary',
}

function fmtMinutes(m: number): string {
  if (m === 0) return '0m'
  const h = Math.floor(m / 60)
  const min = m % 60
  return h > 0 ? `${h}h ${min}m` : `${min}m`
}

export function TodayCard() {
  const { data } = useSuspenseQuery(attendanceQueries.today())
  const entry = data.entry
  const status = entry?.status ?? 'not_started'

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardDescription className="flex items-center gap-1.5">
              <CalendarDays className="size-3.5" />
              {data.date}
            </CardDescription>
            <CardTitle className="text-2xl">今日の勤怠</CardTitle>
          </div>
          <Badge variant={STATUS_VARIANT[status]}>{STATUS_LABEL[status]}</Badge>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <Stat
            icon={<LogIn className="size-4" />}
            label="出勤"
            value={entry?.clockInAt ? formatTime(new Date(entry.clockInAt)) : '-'}
          />
          <Stat
            icon={<LogOut className="size-4" />}
            label="退勤"
            value={
              entry?.clockOutAt ? formatTime(new Date(entry.clockOutAt)) : '-'
            }
          />
          <Stat
            icon={<Coffee className="size-4" />}
            label="休憩"
            value={fmtMinutes(data.breakMinutes)}
          />
          <Stat
            icon={<CalendarDays className="size-4" />}
            label="労働"
            value={fmtMinutes(data.workingMinutes)}
          />
        </div>
        <Separator />
        <ClockButtons status={status} />
      </CardContent>
    </Card>
  )
}

function Stat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="bg-muted text-muted-foreground rounded-md p-2">{icon}</div>
      <div>
        <div className="text-muted-foreground text-xs">{label}</div>
        <div className="font-mono font-medium">{value}</div>
      </div>
    </div>
  )
}
