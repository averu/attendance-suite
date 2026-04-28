import { useSuspenseQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { attendanceQueries } from '../queries'
import { formatTime } from '@/shared/lib/datetime'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/ui/table'
import { Badge } from '@/shared/ui/badge'
import { Card, CardContent } from '@/shared/ui/card'

const STATUS_LABEL: Record<string, string> = {
  not_started: '未出勤',
  working: '勤務中',
  on_break: '休憩中',
  finished: '完了',
}

function fmtMinutes(m: number): string {
  if (m === 0) return '-'
  const h = Math.floor(m / 60)
  const min = m % 60
  return h > 0 ? `${h}h ${min}m` : `${min}m`
}

export function AttendanceMonthTable({
  yearMonth,
  userId,
  detailHrefBase = '/attendance',
}: {
  yearMonth: string
  userId?: string
  detailHrefBase?: string
}) {
  const { data: items } = useSuspenseQuery(
    attendanceQueries.monthly(yearMonth, userId),
  )
  if (items.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          {yearMonth} の記録はありません
        </CardContent>
      </Card>
    )
  }
  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>日付</TableHead>
              <TableHead>状態</TableHead>
              <TableHead>出勤</TableHead>
              <TableHead>退勤</TableHead>
              <TableHead className="text-right">労働</TableHead>
              <TableHead className="text-right">休憩</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((d) => (
              <TableRow key={d.workDate}>
                <TableCell>
                  <Link
                    to={`${detailHrefBase}/${d.workDate}`}
                    className="underline-offset-4 hover:underline"
                  >
                    {d.workDate}
                  </Link>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{STATUS_LABEL[d.status]}</Badge>
                </TableCell>
                <TableCell className="font-mono text-xs">
                  {d.clockInAt ? formatTime(new Date(d.clockInAt)) : '-'}
                </TableCell>
                <TableCell className="font-mono text-xs">
                  {d.clockOutAt ? formatTime(new Date(d.clockOutAt)) : '-'}
                </TableCell>
                <TableCell className="text-right font-mono">
                  {fmtMinutes(d.workingMinutes)}
                </TableCell>
                <TableCell className="text-right font-mono">
                  {fmtMinutes(d.breakMinutes)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
