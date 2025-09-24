// 경로: app/history/page.tsx
// 역할: 사용자 학습 이력 목록(최근 세션) 표시. 각 항목에서 다시풀기 페이지로 이동
// 관계: 데이터는 GET /api/history, 상세는 /history/[sessionId]
"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { LoadingState } from "@/components/loading-spinner"
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
  // handleOpenReplay: 선택한 세션 상세 페이지로 이동한다.

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
  // handleRetry: 데이터 로딩에 실패했을 때 다시 요청을 시도한다.

  if (loading) {
    return (
      <ProtectedRoute>
        <AppLayout>
          <div className="flex min-h-[400px] items-center justify-center px-6">
            <LoadingState
              title="학습 이력을 불러오는 중이에요"
              message="최근 학습 기록을 정리하고 있어요."
              hint="잠시만 기다려 주세요."
              className="max-w-md"
            />
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
