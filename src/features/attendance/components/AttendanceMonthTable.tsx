import { useSuspenseQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { Loader2, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { attendanceQueries } from '../queries'
import { useDeleteAttendanceEntry } from '../mutations'
import { useSession } from '@/features/auth'
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
import { Button } from '@/shared/ui/button'
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
}: {
  yearMonth: string
  userId?: string
}) {
  const { data: items } = useSuspenseQuery(
    attendanceQueries.monthly(yearMonth, userId),
  )
  const session = useSession()
  const callerUserId = session.data.user?.id
  // 削除ボタンの target user id: admin 表示時 (userId prop あり) はそれ、自分の画面なら自分
  const targetUserId = userId ?? callerUserId ?? null
  const isAdminView = !!userId
  const role = session.data.membership?.role
  const isAdmin = role === 'admin' || role === 'owner'
  // member は自分のページ、admin は他人/自分どちらでも削除可能
  const canDelete = !!targetUserId && (!isAdminView || isAdmin)
  const del = useDeleteAttendanceEntry()

  function onDelete(workDate: string) {
    if (!targetUserId) return
    if (!confirm(`${workDate} の打刻を削除しますか？ (この操作は監査ログに残ります)`))
      return
    del.mutate(
      { userId: targetUserId, workDate },
      {
        onSuccess: () => toast.success('削除しました'),
        onError: (e) => toast.error((e as Error).message),
      },
    )
  }
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
              {canDelete && <TableHead className="w-12"></TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((d) => (
              <TableRow key={d.workDate}>
                <TableCell>
                  {userId ? (
                    <Link
                      to="/admin/members/$userId/$date"
                      params={{ userId, date: d.workDate }}
                      className="underline-offset-4 hover:underline"
                    >
                      {d.workDate}
                    </Link>
                  ) : (
                    <Link
                      to="/attendance/$date"
                      params={{ date: d.workDate }}
                      className="underline-offset-4 hover:underline"
                    >
                      {d.workDate}
                    </Link>
                  )}
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
                {canDelete && (
                  <TableCell>
                    {d.status !== 'not_started' && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label={`${d.workDate} の打刻を削除`}
                        disabled={del.isPending}
                        onClick={() => onDelete(d.workDate)}
                      >
                        {del.isPending ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <Trash2 className="size-4" />
                        )}
                      </Button>
                    )}
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
