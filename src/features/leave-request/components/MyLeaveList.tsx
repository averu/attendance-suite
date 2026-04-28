import { useSuspenseQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { leaveRequestQueries } from '../queries'
import { useCancelLeaveRequest } from '../mutations'
import {
  LEAVE_STATUS_LABEL,
  LEAVE_TYPE_LABEL,
  type LeaveStatus,
} from '../types'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/ui/table'
import { Card, CardContent } from '@/shared/ui/card'
import { Button } from '@/shared/ui/button'
import { Badge } from '@/shared/ui/badge'

const STATUS_VARIANT: Record<
  LeaveStatus,
  'default' | 'secondary' | 'destructive' | 'outline'
> = {
  pending: 'default',
  approved: 'secondary',
  rejected: 'destructive',
  cancelled: 'outline',
}

function rangeLabel(start: string, end: string): string {
  return start === end ? start : `${start} 〜 ${end}`
}

export function MyLeaveList() {
  const { data: items } = useSuspenseQuery(leaveRequestQueries.mine())
  const cancel = useCancelLeaveRequest()

  if (items.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          休暇申請はまだありません
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
              <TableHead>期間</TableHead>
              <TableHead>種別</TableHead>
              <TableHead>理由</TableHead>
              <TableHead>状態</TableHead>
              <TableHead>作成日</TableHead>
              <TableHead className="w-32">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-mono text-xs">
                  {rangeLabel(r.startDate, r.endDate)}
                </TableCell>
                <TableCell>{LEAVE_TYPE_LABEL[r.leaveType]}</TableCell>
                <TableCell className="max-w-xs truncate">{r.reason}</TableCell>
                <TableCell>
                  <Badge variant={STATUS_VARIANT[r.status]}>
                    {LEAVE_STATUS_LABEL[r.status]}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground text-xs">
                  {new Date(r.createdAt).toLocaleString('ja-JP')}
                </TableCell>
                <TableCell>
                  {r.status === 'pending' && (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={cancel.isPending}
                      onClick={() =>
                        cancel.mutate(
                          { requestId: r.id },
                          {
                            onSuccess: () => toast.success('キャンセルしました'),
                            onError: (e) => toast.error((e as Error).message),
                          },
                        )
                      }
                    >
                      キャンセル
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
