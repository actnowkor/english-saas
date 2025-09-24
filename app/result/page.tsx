// 경로: app/result/page.tsx
// 역할: /api/sessions/:id/result 로드 → 요약 카드 중심 결과 표시
// 관계: 결과 데이터 GET /api/sessions/:id/result, 대시보드로 복귀 링크 /dashboard

"use client"

import { useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { AppLayout } from "@/components/layout/app-layout"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { LoadingState } from "@/components/loading-spinner"

type ResultItem = {
  item_id: string
  order_index: number
  question: string
  correct_answer: string
  user_answer: string
  label: string | null
  feedback: string | null
  minimal_rewrite: string | null
  type?: string | null
  level?: string | null
  concept_key?: string | null
  concept_ko?: string | null
}

export default function ResultPage() {
  const sp = useSearchParams()
  const sid = sp.get("sid")
  const [loading, setLoading] = useState(true)
  const [items, setItems] = useState<ResultItem[]>([])
  const [summary, setSummary] = useState({ total: 0, correct: 0 })

  useEffect(() => {
    const load = async () => {
      if (!sid) return
      try {
        const res = await fetch(`/api/sessions/${encodeURIComponent(sid)}/result`, { cache: "no-store" })
        const json = await res.json()
        if (json?.items) {
          setItems(json.items)
          setSummary({ total: json.total ?? json.items.length, correct: json.correct ?? 0 })
        }
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [sid])

  return (
    <ProtectedRoute>
      <AppLayout>
        <div className="max-w-3xl mx-auto p-4 space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold">학습 결과 요약</h1>
          </div>

          {loading && (
            <LoadingState
              title="결과를 준비하는 중이에요"
              message="조금만 기다리시면 이번 학습의 요약을 정리해 드릴게요."
            />
          )}
          {!loading && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>총괄</CardTitle>
                  <CardDescription>이번 세션의 핵심 지표</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm text-muted-foreground">총 문제</div>
                      <div className="text-2xl font-semibold">{summary.total}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">정답(허용 포함)</div>
                      <div className="text-2xl font-semibold">{summary.correct}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">정답률</div>
                      <div className="text-2xl font-semibold">{summary.total > 0 ? Math.round((summary.correct / summary.total) * 100) : 0}%</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">오답</div>
                      <div className="text-2xl font-semibold">{Math.max(0, summary.total - summary.correct)}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-center">
                <Button asChild size="lg">
                  <Link href="/dashboard">대시보드로 돌아가기</Link>
                </Button>
              </div>
            </>
          )}
        </div>
      </AppLayout>
    </ProtectedRoute>
  )
}
// ResultPage: 세션 결과 요약과 대시보드 복귀 버튼을 보여준다.

// 사용법: 학습 종료 후 /result?sid=세션ID 경로에서 접근한다.
