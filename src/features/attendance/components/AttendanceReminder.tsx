import { useSuspenseQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { AlertTriangle } from 'lucide-react'
import { attendanceQueries } from '../queries'
import { formatTime } from '@/shared/lib/datetime'
import { Alert, AlertDescription, AlertTitle } from '@/shared/ui/alert'
import { Button } from '@/shared/ui/button'

export function AttendanceReminder() {
  const { data: items } = useSuspenseQuery(attendanceQueries.reminders())
  if (items.length === 0) return null

  return (
    <Alert variant="destructive">
      <AlertTriangle />
      <AlertTitle>退勤打刻忘れ ({items.length} 件)</AlertTitle>
      <AlertDescription className="grid gap-2 mt-2">
        <p className="text-sm">
          以下の日に退勤打刻が記録されていません。修正申請を作成してください。
        </p>
        <ul className="grid gap-1 text-sm">
          {items.map((r) => (
            <li
              key={r.workDate}
              className="flex items-center justify-between gap-3 bg-card/50 rounded-md px-2 py-1"
            >
              <span className="font-mono">
                {r.workDate} (出勤 {formatTime(new Date(r.clockInAt))})
              </span>
              <Button asChild size="sm" variant="outline">
                <Link to="/requests/new" search={{ date: r.workDate }}>
                  修正申請
                </Link>
              </Button>
            </li>
          ))}
        </ul>
      </AlertDescription>
    </Alert>
  )
}
