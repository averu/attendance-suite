import { useSuspenseQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { CalendarDays, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { organizationQueries } from '../queries'
import { useChangeRole, useRemoveMember } from '../mutations'
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

  return (
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
            {members.map((m) => (
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
                            onSuccess: () => toast.success('ロールを更新しました'),
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
                    <Link to="/admin/members/$userId" params={{ userId: m.userId }}>
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
                              onError: (e) => toast.error((e as Error).message),
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
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
