import { useSuspenseQuery } from '@tanstack/react-query'
import { Check, X } from 'lucide-react'
import { toast } from 'sonner'
import { leaveRequestQueries } from '../queries'
import {
  useApproveLeaveRequest,
  useRejectLeaveRequest,
} from '../mutations'
import { LEAVE_TYPE_LABEL } from '../types'
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

function rangeLabel(start: string, end: string): string {
  return start === end ? start : `${start} 〜 ${end}`
}

export function AdminLeaveList() {
  const { data: items } = useSuspenseQuery(
    leaveRequestQueries.org({ status: 'pending' }),
  )
  const approve = useApproveLeaveRequest()
  const reject = useRejectLeaveRequest()
  const pending = approve.isPending || reject.isPending

  if (items.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          未対応の休暇申請はありません
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
              <TableHead>申請者</TableHead>
              <TableHead>期間</TableHead>
              <TableHead>種別</TableHead>
              <TableHead>理由</TableHead>
              <TableHead className="w-44">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{r.requesterName}</TableCell>
                <TableCell className="font-mono text-xs">
                  {rangeLabel(r.startDate, r.endDate)}
                </TableCell>
                <TableCell>{LEAVE_TYPE_LABEL[r.leaveType]}</TableCell>
                <TableCell className="max-w-xs truncate">{r.reason}</TableCell>
                <TableCell className="flex gap-2">
                  <Button
                    size="sm"
                    disabled={pending}
                    onClick={() =>
                      approve.mutate(
                        { requestId: r.id },
                        {
                          onSuccess: () => toast.success('承認しました'),
                          onError: (e) => toast.error((e as Error).message),
                        },
                      )
                    }
                  >
                    <Check />
                    承認
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={pending}
                    onClick={() =>
                      reject.mutate(
                        { requestId: r.id },
                        {
                          onSuccess: () => toast.success('却下しました'),
                          onError: (e) => toast.error((e as Error).message),
                        },
                      )
                    }
                  >
                    <X />
                    却下
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
