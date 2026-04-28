import { useSuspenseQuery } from '@tanstack/react-query'
import { CalendarCheck, CalendarOff, Clock, Plane, Timer } from 'lucide-react'
import { summaryQueries } from '../queries'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/ui/card'

function fmtMinutes(m: number): string {
  if (m === 0) return '0h'
  const h = Math.floor(m / 60)
  const min = m % 60
  return min === 0 ? `${h}h` : `${h}h ${min}m`
}

function fmtDays(d: number): string {
  return Number.isInteger(d) ? String(d) : d.toFixed(1)
}

export function MyMonthlySummaryCard({ yearMonth }: { yearMonth: string }) {
  const { data } = useSuspenseQuery(summaryQueries.mine(yearMonth))
  const m = data.member

  return (
    <Card>
      <CardHeader>
        <CardDescription>今月のサマリ</CardDescription>
        <CardTitle className="flex items-center gap-2">
          {data.yearMonth}
          <span className="text-xs font-normal text-muted-foreground">
            所定 {data.scheduledWorkingDays} 日
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!m ? (
          <p className="text-muted-foreground text-sm">
            今月の勤怠記録はまだありません
          </p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Stat
              icon={<CalendarCheck className="size-4" />}
              label="出勤日数"
              value={`${m.workingDays} 日`}
            />
            <Stat
              icon={<Clock className="size-4" />}
              label="労働"
              value={fmtMinutes(m.workingMinutes)}
            />
            <Stat
              icon={<Timer className="size-4" />}
              label="残業"
              value={fmtMinutes(m.overtimeMinutes)}
              highlight={m.overtimeMinutes > 0}
            />
            <Stat
              icon={<Plane className="size-4" />}
              label="有給"
              value={`${fmtDays(m.paidLeaveDays)} 日`}
            />
            {m.otherLeaveDays > 0 && (
              <Stat
                icon={<CalendarOff className="size-4" />}
                label="他休暇"
                value={`${fmtDays(m.otherLeaveDays)} 日`}
              />
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function Stat({
  icon,
  label,
  value,
  highlight = false,
}: {
  icon: React.ReactNode
  label: string
  value: string
  highlight?: boolean
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="bg-muted text-muted-foreground rounded-md p-2">{icon}</div>
      <div>
        <div className="text-muted-foreground text-xs">{label}</div>
        <div className={highlight ? 'font-mono font-medium text-destructive' : 'font-mono font-medium'}>
          {value}
        </div>
      </div>
    </div>
  )
}
