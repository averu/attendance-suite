import { useState } from 'react'
import { useSuspenseQuery } from '@tanstack/react-query'
import { Loader2, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { holidayQueries } from '../queries'
import { useCreateHoliday, useDeleteHoliday } from '../mutations'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/ui/card'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/ui/table'

export function HolidaysManager() {
  const { data: items } = useSuspenseQuery(holidayQueries.list())
  const create = useCreateHoliday()
  const del = useDeleteHoliday()

  const [date, setDate] = useState('')
  const [name, setName] = useState('')

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    try {
      await create.mutateAsync({ date, name })
      toast.success('公休日を追加しました')
      setDate('')
      setName('')
    } catch (err) {
      toast.error((err as Error).message)
    }
  }

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>公休/祝日を追加</CardTitle>
          <CardDescription>
            この組織の公休として扱う日。月次集計の所定労働日数から控除されます。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={onSubmit}
            className="grid sm:grid-cols-[180px_1fr_auto] gap-3 max-w-2xl"
          >
            <div className="grid gap-1.5">
              <Label htmlFor="hd-date">日付</Label>
              <Input
                id="hd-date"
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="hd-name">名称</Label>
              <Input
                id="hd-name"
                required
                placeholder="例: 創立記念日"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label className="invisible">.</Label>
              <Button type="submit" disabled={create.isPending}>
                {create.isPending && <Loader2 className="animate-spin" />}
                追加
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>登録済み公休</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {items.length === 0 ? (
            <p className="text-muted-foreground text-sm p-6">
              まだ登録されていません
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-32">日付</TableHead>
                  <TableHead>名称</TableHead>
                  <TableHead className="w-20">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((h) => (
                  <TableRow key={h.id}>
                    <TableCell className="font-mono">{h.date}</TableCell>
                    <TableCell>{h.name}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          if (confirm(`${h.date} ${h.name} を削除しますか?`)) {
                            del.mutate(
                              { id: h.id },
                              {
                                onSuccess: () => toast.success('削除しました'),
                                onError: (e) => toast.error((e as Error).message),
                              },
                            )
                          }
                        }}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
