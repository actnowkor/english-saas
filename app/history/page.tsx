// 경로: app/history/page.tsx
// 역할: 사용자 학습 이력 목록(최근 세션) 표시. 각 항목에서 다시풀기 페이지로 이동
// 관계: 데이터는 GET /api/history, 상세는 /history/[sessionId]
"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { AppLayout } from "@/components/layout/app-layout"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { SessionList } from "@/components/history/session-list"
import { useTranslation } from "@/lib/i18n"
type HistorySession = {
  session_id: string
  session_type: "standard" | "review_only" | "new_only" | "weakness"
  date: string
  correct_rate: number
  time_spent_sec: number
  total_items: number
}
import { History, AlertCircle } from "lucide-react"

export default function HistoryPage() {
  const [sessions, setSessions] = useState<HistorySession[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const { t } = useTranslation()
  const router = useRouter()

  useEffect(() => {
    const loadHistory = async () => {
      try {
        const res = await fetch("/api/history", { cache: "no-store" })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const json: HistorySession[] = await res.json()
        setSessions(json)
      } catch (err) {
        setError(true)
      } finally {
        setLoading(false)
      }
    }
    loadHistory()
  }, [])

  const handleOpenReplay = (sessionId: string) => {
    router.push(`/history/${sessionId}`)
  }

  const handleRetry = async () => {
    setError(false)
    setLoading(true)
    try {
      const res = await fetch("/api/history", { cache: "no-store" })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json: HistorySession[] = await res.json()
      setSessions(json)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <ProtectedRoute>
        <AppLayout>
          <div className="space-y-6">
            <div>
              <Skeleton className="h-8 w-48 mb-2" />
              <Skeleton className="h-4 w-96" />
            </div>

            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <Skeleton className="h-5 w-16" />
                          <Skeleton className="h-4 w-24" />
                        </div>
                        <div className="flex items-center gap-4">
                          <Skeleton className="h-4 w-12" />
                          <Skeleton className="h-4 w-16" />
                          <Skeleton className="h-4 w-12" />
                        </div>
                      </div>
                      <Skeleton className="h-8 w-20" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </AppLayout>
      </ProtectedRoute>
    )
  }

  if (error) {
    return (
      <ProtectedRoute>
        <AppLayout>
          <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
            <AlertCircle className="h-12 w-12 text-destructive" />
            <p className="text-muted-foreground">{t("common.error")}</p>
            <Button onClick={handleRetry}>{t("common.retry")}</Button>
          </div>
        </AppLayout>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute>
      <AppLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <History className="h-8 w-8" />
              {t("history.title")}
            </h1>
            <p className="text-muted-foreground">지난 학습 세션들을 확인하고 다시 풀어보세요</p>
          </div>

          <SessionList sessions={sessions} onOpenReplay={handleOpenReplay} />
        </div>
      </AppLayout>
    </ProtectedRoute>
  )
}
