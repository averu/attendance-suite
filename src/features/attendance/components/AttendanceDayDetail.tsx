import { useSuspenseQuery } from '@tanstack/react-query'
import { attendanceQueries } from '../queries'
import { formatTime } from '@/shared/lib/datetime'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/ui/card'
import { Badge } from '@/shared/ui/badge'

const STATUS_LABEL: Record<string, string> = {
  not_started: '未出勤',
  working: '勤務中',
  on_break: '休憩中',
  finished: '完了',
}

export function AttendanceDayDetail({
  workDate,
  userId,
}: {
  workDate: string
  userId?: string
}) {
  const { data: entry } = useSuspenseQuery(
    attendanceQueries.detail(workDate, userId),
  )
  if (!entry) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          {workDate} の記録はありません
        </CardContent>
      </Card>
    )
  }
  return (
    <Card>
      <CardHeader>
        <CardDescription>{entry.workDate}</CardDescription>
        <CardTitle className="flex items-center gap-2">
          勤怠詳細
          <Badge variant="outline">{STATUS_LABEL[entry.status]}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-muted-foreground text-xs">出勤</div>
            <div className="font-mono">
              {entry.clockInAt ? formatTime(new Date(entry.clockInAt)) : '-'}
            </div>
          </div>
          <div>
            <div className="text-muted-foreground text-xs">退勤</div>
            <div className="font-mono">
              {entry.clockOutAt ? formatTime(new Date(entry.clockOutAt)) : '-'}
            </div>
          </div>
        </div>
        <div>
          <div className="text-muted-foreground text-sm font-medium mb-2">
            休憩
          </div>
          {entry.breaks.length === 0 ? (
            <p className="text-muted-foreground text-sm">なし</p>
          ) : (
            <ul className="space-y-1 text-sm font-mono">
              {entry.breaks.map((b) => (
                <li key={b.id}>
                  {formatTime(new Date(b.startAt))} —{' '}
                  {b.endAt ? formatTime(new Date(b.endAt)) : '休憩中'}
                </li>
              ))}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
