import { useSuspenseQuery } from '@tanstack/react-query'
import { Check, X } from 'lucide-react'
import { toast } from 'sonner'
import { correctionRequestQueries } from '../queries'
import {
  useApproveCorrectionRequest,
  useRejectCorrectionRequest,
} from '../mutations'
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

function fmtTime(iso: string | null): string {
  if (!iso) return '-'
  return new Date(iso).toLocaleTimeString('ja-JP', {
    timeZone: 'Asia/Tokyo',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function AdminRequestList() {
  const { data: items } = useSuspenseQuery(
    correctionRequestQueries.org({ status: 'pending' }),
  )
  const approve = useApproveCorrectionRequest()
  const reject = useRejectCorrectionRequest()
  const pending = approve.isPending || reject.isPending

  if (items.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          未対応の申請はありません
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
              <TableHead>対象日</TableHead>
              <TableHead>理由</TableHead>
              <TableHead>出勤希望</TableHead>
              <TableHead>退勤希望</TableHead>
              <TableHead className="w-44">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{r.requesterName}</TableCell>
                <TableCell className="font-mono">{r.targetDate}</TableCell>
                <TableCell className="max-w-xs truncate">{r.reason}</TableCell>
                <TableCell className="font-mono text-xs">
                  {fmtTime(r.proposedClockInAt)}
                </TableCell>
                <TableCell className="font-mono text-xs">
                  {fmtTime(r.proposedClockOutAt)}
                </TableCell>
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
