import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { AdminStats } from "@/lib/mock-data"
import { FileText, CheckCircle, TrendingUp, Users } from "lucide-react"

interface AdminStatsProps {
  stats: AdminStats
}

export function AdminStatsCards({ stats }: AdminStatsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">전체 문제 수</CardTitle>
          <FileText className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.total_problems.toLocaleString()}</div>
          <p className="text-xs text-muted-foreground">총 문제 개수</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">퍼블리시된 문제</CardTitle>
          <CheckCircle className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.published_problems.toLocaleString()}</div>
          <p className="text-xs text-muted-foreground">
            {Math.round((stats.published_problems / stats.total_problems) * 100)}% 승인됨
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">최근 세션 수</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.recent_sessions}</div>
          <p className="text-xs text-muted-foreground">지난 7일</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">활성 사용자</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.active_users}</div>
          <p className="text-xs text-muted-foreground">이번 주</p>
        </CardContent>
      </Card>
    </div>
  )
}
