import { useState } from 'react'
import { useSuspenseQuery } from '@tanstack/react-query'
import { Check, Loader2, X } from 'lucide-react'
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
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulking, setBulking] = useState<'approve' | 'reject' | null>(null)
  const rowBusy = approve.isPending || reject.isPending || bulking !== null

  function toggle(id: string, on: boolean) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (on) next.add(id)
      else next.delete(id)
      return next
    })
  }
  function toggleAll(on: boolean) {
    setSelected(on ? new Set(items.map((i) => i.id)) : new Set())
  }

  async function bulkRun(action: 'approve' | 'reject') {
    const ids = items.filter((i) => selected.has(i.id)).map((i) => i.id)
    if (ids.length === 0) return
    setBulking(action)
    const mut = action === 'approve' ? approve : reject
    const results = await Promise.allSettled(
      ids.map((requestId) => mut.mutateAsync({ requestId })),
    )
    const ok = results.filter((r) => r.status === 'fulfilled').length
    const ng = results.length - ok
    setBulking(null)
    setSelected(new Set())
    const verb = action === 'approve' ? '承認' : '却下'
    if (ng === 0) toast.success(`${ok} 件を${verb}しました`)
    else toast.error(`${ok} 件${verb} / ${ng} 件失敗`)
  }

  if (items.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          未対応の休暇申請はありません
        </CardContent>
      </Card>
    )
  }
  const allChecked = selected.size === items.length
  const someChecked = selected.size > 0 && !allChecked
  return (
    <Card>
      <CardContent className="p-0">
        {selected.size > 0 && (
          <div className="flex items-center justify-between border-b bg-muted/40 px-4 py-2">
            <span className="text-sm">{selected.size} 件選択中</span>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                disabled={rowBusy}
                onClick={() => bulkRun('approve')}
              >
                {bulking === 'approve' ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <Check />
                )}
                一括承認
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={rowBusy}
                onClick={() => bulkRun('reject')}
              >
                {bulking === 'reject' ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <X />
                )}
                一括却下
              </Button>
            </div>
          </div>
        )}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <input
                  type="checkbox"
                  aria-label="全選択"
                  className="size-4 align-middle"
                  checked={allChecked}
                  ref={(el) => {
                    if (el) el.indeterminate = someChecked
                  }}
                  onChange={(e) => toggleAll(e.target.checked)}
                />
              </TableHead>
              <TableHead>申請者</TableHead>
              <TableHead>期間</TableHead>
              <TableHead>種別</TableHead>
              <TableHead>理由</TableHead>
              <TableHead className="w-44">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((r) => (
              <TableRow key={r.id} data-selected={selected.has(r.id)}>
                <TableCell>
                  <input
                    type="checkbox"
                    aria-label={`${r.requesterName} の申請を選択`}
                    className="size-4 align-middle"
                    checked={selected.has(r.id)}
                    onChange={(e) => toggle(r.id, e.target.checked)}
                  />
                </TableCell>
                <TableCell className="font-medium">{r.requesterName}</TableCell>
                <TableCell className="font-mono text-xs">
                  {rangeLabel(r.startDate, r.endDate)}
                </TableCell>
                <TableCell>{LEAVE_TYPE_LABEL[r.leaveType]}</TableCell>
                <TableCell className="max-w-xs truncate">{r.reason}</TableCell>
                <TableCell className="flex gap-2">
                  <Button
                    size="sm"
                    disabled={rowBusy}
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
                    disabled={rowBusy}
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
