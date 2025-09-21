"use client"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { useTranslation } from "@/lib/i18n"
import { useToast } from "@/hooks/use-toast"
import type { Problem } from "@/lib/mock-data"
import { Edit } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { ko } from "date-fns/locale"

interface ProblemTableProps {
  problems: Problem[]
  onEditProblem: (problemId: string) => void
  onToggleStatus: (problemId: string, newStatus: "draft" | "approved") => void
}

export function ProblemTable({ problems, onEditProblem, onToggleStatus }: ProblemTableProps) {
  const { t } = useTranslation()
  const { toast } = useToast()

  const handleStatusToggle = (problem: Problem) => {
    const newStatus = problem.status === "draft" ? "approved" : "draft"
    onToggleStatus(problem.id, newStatus)

    toast({
      title: "상태가 변경되었습니다",
      description: `문제가 ${newStatus === "approved" ? "승인" : "초안"}으로 변경되었습니다`,
    })
  }

  if (problems.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">조건에 맞는 문제가 없습니다</p>
      </div>
    )
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("admin.problems.table.item")}</TableHead>
            <TableHead>{t("admin.problems.table.level")}</TableHead>
            <TableHead>{t("admin.problems.table.status")}</TableHead>
            <TableHead>{t("admin.problems.table.created_at")}</TableHead>
            <TableHead className="text-right">작업</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {problems.map((problem) => (
            <TableRow key={problem.id}>
              <TableCell className="max-w-xs">
                <div>
                  <p className="font-medium truncate">{problem.korean_text}</p>
                  <p className="text-sm text-muted-foreground truncate">{problem.english_answer}</p>
                </div>
              </TableCell>
              <TableCell>
                <Badge variant="outline">{problem.level}</Badge>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Switch checked={problem.status === "approved"} onCheckedChange={() => handleStatusToggle(problem)} />
                  <Badge variant={problem.status === "approved" ? "default" : "secondary"}>
                    {t(`admin.problems.status.${problem.status}`)}
                  </Badge>
                </div>
              </TableCell>
              <TableCell>
                <span className="text-sm text-muted-foreground">
                  {formatDistanceToNow(new Date(problem.created_at), {
                    addSuffix: true,
                    locale: ko,
                  })}
                </span>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" size="sm" onClick={() => onEditProblem(problem.id)}>
                    <Edit className="h-3 w-3" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
