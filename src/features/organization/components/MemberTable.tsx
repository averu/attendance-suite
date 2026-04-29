import { useState } from 'react'
import { useSuspenseQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { CalendarDays, Search, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { organizationQueries } from '../queries'
import { useChangeRole, useRemoveMember } from '../mutations'
import { searchMembers } from '../searchMembers'
import type { Role } from '../types'
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
import { Input } from '@/shared/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select'

export function MemberTable({ canEdit }: { canEdit: boolean }) {
  const { data: members } = useSuspenseQuery(organizationQueries.members())
  const changeRole = useChangeRole()
  const removeMember = useRemoveMember()
  const [query, setQuery] = useState('')

  const filtered = searchMembers(members, query)

  return (
    <div className="grid gap-3">
      <div className="flex items-center gap-2 max-w-sm">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="名前 / Email / Role で検索"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-8"
          />
        </div>
        {query && (
          <span className="text-xs text-muted-foreground">
            {filtered.length} / {members.length}
          </span>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>名前</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>参加日</TableHead>
                <TableHead className="w-32">勤怠</TableHead>
                {canEdit && <TableHead className="w-20">操作</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={99}
                    className="text-center text-muted-foreground py-8"
                  >
                    該当するメンバーがいません
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((m) => (
                  <TableRow key={m.membershipId}>
                    <TableCell className="font-medium">{m.name}</TableCell>
                    <TableCell className="text-muted-foreground">{m.email}</TableCell>
                    <TableCell>
                      {canEdit ? (
                        <Select
                          value={m.role}
                          onValueChange={(value) =>
                            changeRole.mutate(
                              { membershipId: m.membershipId, role: value as Role },
                              {
                                onSuccess: () =>
                                  toast.success('ロールを更新しました'),
                                onError: (e) => toast.error((e as Error).message),
                              },
                            )
                          }
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="member">member</SelectItem>
                            <SelectItem value="admin">admin</SelectItem>
                            <SelectItem value="owner">owner</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge variant="outline" className="capitalize">
                          {m.role}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {new Date(m.joinedAt).toLocaleDateString('ja-JP')}
                    </TableCell>
                    <TableCell>
                      <Button asChild variant="outline" size="sm">
                        <Link
                          to="/admin/members/$userId"
                          params={{ userId: m.userId }}
                        >
                          <CalendarDays />
                          勤怠
                        </Link>
                      </Button>
                    </TableCell>
                    {canEdit && (
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            if (confirm(`${m.name} を削除しますか？`)) {
                              removeMember.mutate(
                                { membershipId: m.membershipId },
                                {
                                  onSuccess: () => toast.success('削除しました'),
                                  onError: (e) =>
                                    toast.error((e as Error).message),
                                },
                              )
                            }
                          }}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
