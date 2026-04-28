import { useSuspenseQuery } from '@tanstack/react-query'
import { Download, Lock, Unlock } from 'lucide-react'
import { toast } from 'sonner'
import { summaryQueries } from '../queries'
import { useToggleMonthlyLock } from '../mutations'
import { useSession } from '@/features/auth'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/ui/table'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import { Button } from '@/shared/ui/button'
import { Badge } from '@/shared/ui/badge'

function fmtMinutes(m: number): string {
  const h = Math.floor(m / 60)
  const min = m % 60
  return `${h}h ${min}m`
}

function fmtDays(d: number): string {
  return Number.isInteger(d) ? String(d) : d.toFixed(1)
}

export function MonthlySummaryTable({ yearMonth }: { yearMonth: string }) {
  const { data: summary } = useSuspenseQuery(summaryQueries.monthly(yearMonth))
  const session = useSession()
  const isOwner = session.data.membership?.role === 'owner'
  const toggleLock = useToggleMonthlyLock()

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="grid gap-1">
            <CardTitle className="flex items-center gap-2">
              {summary.yearMonth}
              {summary.isLocked ? (
                <Badge variant="destructive" className="gap-1">
                  <Lock className="size-3" />
                  ロック中
                </Badge>
              ) : (
                <Badge variant="outline">未ロック</Badge>
              )}
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              所定労働日数 {summary.scheduledWorkingDays} 日 (平日 - 公休)
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="sm">
              <a
                href={`/api/summary/csv?yearMonth=${encodeURIComponent(summary.yearMonth)}`}
                download
              >
                <Download />
                CSV
              </a>
            </Button>
            {isOwner && (
              <Button
                variant={summary.isLocked ? 'outline' : 'default'}
                size="sm"
                disabled={toggleLock.isPending}
                onClick={() =>
                  toggleLock.mutate(
                    {
                      yearMonth: summary.yearMonth,
                      action: summary.isLocked ? 'unlock' : 'lock',
                    },
                    {
                      onSuccess: () =>
                        toast.success(
                          summary.isLocked
                            ? 'ロックを解除しました'
                            : '締めをロックしました',
                        ),
                      onError: (e) => toast.error((e as Error).message),
                    },
                  )
                }
              >
                {summary.isLocked ? <Unlock /> : <Lock />}
                {summary.isLocked ? '解除' : '締めをロック'}
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>名前</TableHead>
              <TableHead>Email</TableHead>
              <TableHead className="text-right">出勤日数</TableHead>
              <TableHead className="text-right">有給</TableHead>
              <TableHead className="text-right">他休暇</TableHead>
              <TableHead className="text-right">労働時間</TableHead>
              <TableHead className="text-right">残業</TableHead>
              <TableHead className="text-right">休憩時間</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {summary.members.map((m) => (
              <TableRow key={m.userId}>
                <TableCell className="font-medium">{m.userName}</TableCell>
                <TableCell className="text-muted-foreground">{m.userEmail}</TableCell>
                <TableCell className="text-right font-mono">{m.workingDays}</TableCell>
                <TableCell className="text-right font-mono">
                  {fmtDays(m.paidLeaveDays)}
                </TableCell>
                <TableCell className="text-right font-mono">
                  {fmtDays(m.otherLeaveDays)}
                </TableCell>
                <TableCell className="text-right font-mono">
                  {fmtMinutes(m.workingMinutes)}
                </TableCell>
                <TableCell className="text-right font-mono">
                  <span className={m.overtimeMinutes > 0 ? 'text-destructive' : ''}>
                    {fmtMinutes(m.overtimeMinutes)}
                  </span>
                </TableCell>
                <TableCell className="text-right font-mono">
                  {fmtMinutes(m.breakMinutes)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
