"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { AppLayout } from "@/components/layout/app-layout"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { AdminStatsCards } from "@/components/admin/admin-stats"
import { useTranslation } from "@/lib/i18n"
import { mockAdminStats } from "@/lib/mock-data"
import type { AdminStats } from "@/lib/mock-data"
import { Shield, TrendingUp } from "lucide-react"

export default function AdminPage() {
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [loading, setLoading] = useState(true)
  const { t } = useTranslation()

  useEffect(() => {
    const loadStats = async () => {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000))
      setStats(mockAdminStats)
      setLoading(false)
    }

    loadStats()
  }, [])

  if (loading) {
    return (
      <ProtectedRoute requireAdmin>
        <AppLayout>
          <div className="space-y-6">
            <div>
              <Skeleton className="h-8 w-48 mb-2" />
              <Skeleton className="h-4 w-96" />
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Card key={i}>
                  <CardHeader className="pb-2">
                    <Skeleton className="h-4 w-24" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-8 w-16 mb-1" />
                    <Skeleton className="h-3 w-20" />
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </AppLayout>
      </ProtectedRoute>
    )
  }

  if (!stats) return null

  return (
    <ProtectedRoute requireAdmin>
      <AppLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <Shield className="h-8 w-8" />
              {t("admin.common.title")}
            </h1>
            <p className="text-muted-foreground">시스템 현황과 문제 관리를 확인하세요</p>
          </div>

          <AdminStatsCards stats={stats} />

          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  최근 활동
                </CardTitle>
                <CardDescription>지난 7일간의 학습 활동 요약</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm">완료된 세션</span>
                    <span className="font-medium">{stats.recent_sessions}개</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">활성 사용자</span>
                    <span className="font-medium">{stats.active_users}명</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">평균 정답률</span>
                    <span className="font-medium">78%</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>문제 현황</CardTitle>
                <CardDescription>문제 데이터베이스 상태</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm">전체 문제</span>
                    <span className="font-medium">{stats.total_problems.toLocaleString()}개</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">승인된 문제</span>
                    <span className="font-medium">{stats.published_problems.toLocaleString()}개</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">승인률</span>
                    <span className="font-medium">
                      {Math.round((stats.published_problems / stats.total_problems) * 100)}%
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </AppLayout>
    </ProtectedRoute>
  )
}
