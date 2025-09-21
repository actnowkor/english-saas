// 경로: app/history/[sessionId]/page.tsx
// 역할: 특정 세션의 10문제를 한 페이지에 다시풀기(단순 복습, 서버 업데이트 없음)
// 관계: 데이터 로드 - GET /api/sessions/:id, GET /api/sessions/:id/result (최근 시도/피드백 병합)
"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AppLayout } from "@/components/layout/app-layout"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { ReplayItem } from "@/components/history/replay-item"
import { ArrowLeft, Play, Info, Clock, Target } from "lucide-react"
import { format } from "date-fns"

type ReplayItemShape = {
  session_item_id: string
  replay_attempts: number
  stored_label?: string
  stored_feedback_short?: string
  user_answer_prev?: string
  concept_key?: string
  concept_ko?: string
  snapshot: {
    item_id: string
    level?: number
    source_ko: string
    answer_en: string
    allowed_variants_text: string[]
    near_misses_text: string[]
  }
}
type ReplaySession = {
  session_id: string
  session_type: "standard" | "review_only" | "new_only" | "weakness"
  date: string
  items: ReplayItemShape[]
}

export default function ReplayPage() {
  const [replaySession, setReplaySession] = useState<ReplaySession | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const router = useRouter()
  const params = useParams()
  const sessionId = params.sessionId as string

  useEffect(() => {
    const loadReplaySession = async () => {
      try {
        // 세션 스냅샷
        const res = await fetch(`/api/sessions/${encodeURIComponent(sessionId)}`, { cache: "no-store" })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const json = await res.json()
        const s = json?.session
        if (!s) throw new Error("no session")

        // 최근 시도/피드백
        const rr = await fetch(`/api/sessions/${encodeURIComponent(sessionId)}/result`, { cache: "no-store" })
        const rj = rr.ok ? await rr.json() : { items: [] }
        const resultItems: Array<{ item_id: string; user_answer?: string; label?: string; feedback?: string }> =
          Array.isArray(rj?.items)
            ? rj.items.map((it: any) => ({
                item_id: it.item_id,
                user_answer: it.user_answer ?? undefined,
                label: it.label ?? undefined,
                feedback: it.feedback ?? undefined,
              }))
            : []
        const map = new Map(resultItems.map((x) => [x.item_id, x]))

        const items: ReplayItemShape[] = (s.items ?? []).map((it: any) => {
          const snap = it.snapshot || {}
          const prev = map.get(it.item_id)
          return {
            session_item_id: `${s.session_id}_${it.item_id}`,
            replay_attempts: 0,
            stored_label: prev?.label,
            stored_feedback_short: prev?.feedback,
            user_answer_prev: prev?.user_answer,
            concept_key: it.concept_key || snap.concept_key || undefined,
            concept_ko: it.concept_ko || undefined,
            snapshot: {
              item_id: it.item_id,
              level: snap.level ?? undefined,
              source_ko: snap.source_ko ?? "",
              answer_en: snap.answer_en ?? "",
              allowed_variants_text: Array.isArray(snap.allowed_variants_text)
                ? snap.allowed_variants_text
                : typeof snap.allowed_variants_text === "string"
                ? String(snap.allowed_variants_text).split(/\r?\n|;|\|/g)
                : [],
              near_misses_text: Array.isArray(snap.near_misses_text)
                ? snap.near_misses_text
                : typeof snap.near_misses_text === "string"
                ? String(snap.near_misses_text).split(/\r?\n|;|\|/g)
                : [],
            },
          }
        })

        const type = (json?.session?.strategy?.type as string) || "standard"
        const replay: ReplaySession = {
          session_id: s.session_id,
          session_type: type === "review_only" || type === "new_only" || type === "weakness" ? type : "standard",
          date: new Date().toISOString(),
          items,
        }
        setReplaySession(replay)
      } catch (err) {
        setError(true)
      } finally {
        setLoading(false)
      }
    }
    if (sessionId) void loadReplaySession()
  }, [sessionId])

  if (loading) {
    return (
      <ProtectedRoute>
        <AppLayout>
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <Skeleton className="h-6 w-6" />
              <Skeleton className="h-8 w-48" />
            </div>
            <Alert>
              <Skeleton className="h-4 w-full" />
            </Alert>
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <Card key={i}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <Skeleton className="h-5 w-20" />
                      <Skeleton className="h-5 w-16" />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Skeleton className="h-6 w-3/4 mx-auto" />
                    <Skeleton className="h-4 w-1/2" />
                    <div className="flex gap-2 justify-center">
                      <Skeleton className="h-8 w-24" />
                      <Skeleton className="h-8 w-24" />
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

  if (error || !replaySession) {
    return (
      <ProtectedRoute>
        <AppLayout>
          <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
            <p className="text-muted-foreground">세션을 불러오지 못했습니다</p>
            <Button onClick={() => router.push("/history")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              학습 이력으로 돌아가기
            </Button>
          </div>
        </AppLayout>
      </ProtectedRoute>
    )
  }

  const getSessionTypeBadge = (type: ReplaySession["session_type"]) => {
    const variants = {
      standard: "default" as const,
      review_only: "secondary" as const,
      new_only: "outline" as const,
      weakness: "destructive" as const,
    }
    return variants[type] || "default"
  }

  return (
    <ProtectedRoute>
      <AppLayout>
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => router.push("/history")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                <Play className="h-8 w-8" /> 다시풀기
              </h1>
              <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                <Badge variant={getSessionTypeBadge(replaySession.session_type)}>
                  {replaySession.session_type}
                </Badge>
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" /> {format(new Date(replaySession.date), "yyyy/MM/dd HH:mm")}
                </span>
                <span className="flex items-center gap-1">
                  <Target className="h-3.5 w-3.5" /> 최근 시도 기준 피드백 표시
                </span>
              </div>
            </div>
          </div>

          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>단순 복습용 페이지입니다. 학습 기록/SRS/횟수는 업데이트되지 않습니다.</AlertDescription>
          </Alert>

          <div className="space-y-4">
            {replaySession.items.map((item, index) => (
              <ReplayItem key={item.session_item_id} item={item} index={index} />
            ))}
          </div>

          {/* 하단 중앙 닫기 버튼 */}
          <div className="flex justify-center pt-4 pb-8">
            <Button size="lg" onClick={() => router.push("/history")}>복습창 닫기</Button>
          </div>
        </div>
      </AppLayout>
    </ProtectedRoute>
  )
}
