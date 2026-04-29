import { useSuspenseQuery } from '@tanstack/react-query'
import { History } from 'lucide-react'
import { attendanceQueries } from '../queries'
import type { AuditSnapshot } from '../types'
import { formatTime } from '@/shared/lib/datetime'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import { Badge } from '@/shared/ui/badge'

function snapLine(s: AuditSnapshot | null): string {
  if (!s) return '-'
  const e = s.entry
  const ci = e.clockInAt ? formatTime(new Date(e.clockInAt)) : '-'
  const co = e.clockOutAt ? formatTime(new Date(e.clockOutAt)) : '-'
  const breakCount = e.breaks.length
  return `IN ${ci} / OUT ${co} / 休憩 ${breakCount} 件`
}

export function AuditLogList({
  userId,
  workDate,
}: {
  userId: string
  workDate: string
}) {
  const { data: items } = useSuspenseQuery(
    attendanceQueries.audits(userId, workDate),
  )
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="size-5" />
          編集履歴
        </CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-muted-foreground text-sm">編集履歴はありません</p>
        ) : (
          <ul className="grid gap-3">
            {items.map((a) => (
              <li key={a.id} className="border rounded-md p-3 grid gap-1 text-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={
                        a.action === 'create'
                          ? 'default'
                          : a.action === 'delete'
                            ? 'destructive'
                            : 'secondary'
                      }
                    >
                      {a.action === 'create'
                        ? '新規作成'
                        : a.action === 'delete'
                          ? '削除'
                          : '編集'}
                    </Badge>
                    <span className="font-medium">{a.actorName}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(a.at).toLocaleString('ja-JP')}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs font-mono mt-1">
                  <div>
                    <span className="text-muted-foreground">前: </span>
                    {snapLine(a.before)}
                  </div>
                  <div>
                    <span className="text-muted-foreground">後: </span>
                    {snapLine(a.after)}
                  </div>
                </div>
                {a.note && (
                  <p className="text-xs text-muted-foreground mt-1">📝 {a.note}</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
