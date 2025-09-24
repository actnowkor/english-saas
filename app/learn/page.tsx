// 경로: app/learn/page.tsx
// 역할: 학습 세션 진행 페이지(문항 풀이 및 완료 처리)
// 의존관계: app/api/sessions/*, app/api/attempts, components/dashboard/start-learning-card.tsx
// 포함 함수: StartLearningPlaceholderSkeleton(), LearnSessionCardSkeleton(), LearnPage()

"use client"

import { useEffect, useMemo, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { AppLayout } from "@/components/layout/app-layout"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { LoadingState } from "@/components/loading-spinner"
import { StartLearningCard } from "@/components/dashboard/start-learning-card"
import { SessionStartAlert } from "@/components/learn/session-start-alert"
import { useToast } from "@/hooks/use-toast"
import type { LevelStats } from "@/lib/logic/level-utils"
import type { AccessSummary } from "@/lib/payments/access-summary"

type SnapshotItem = {
  item_id: string
  order_index: number
  snapshot: any
  concept_key?: string
  concept_ko?: string
  type?: string | null
  level?: string | null
}

type LoadedSession = {
  session_id: string
  strategy?: any
  items: SnapshotItem[]
  level_snapshot?: { current_level: number; stats: LevelStats | null } | null
}

type SubmitResult = {
  ok: boolean
  saved: number
  results: {
    item_id: string
    attempt_id: string
    label: "correct" | "variant" | "near_miss" | "wrong"
    feedback: string
  }[]
}

type CompleteResponse = {
  ok?: boolean
  level?: { leveled_up?: boolean; new_level?: number; reason?: string }
}

function StartLearningPlaceholderSkeleton() {
  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader className="space-y-2 pb-3">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-3 w-48" />
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-6 w-20" />
          <Skeleton className="h-6 w-32" />
        </div>
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-4 w-56" />
      </CardContent>
    </Card>
  )
}
// StartLearningPlaceholderSkeleton: 학습 시작 카드의 로딩 상태를 표현한다.

function LearnSessionCardSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-5 w-20" />
      </div>
      <Card>
        <CardHeader className="space-y-2">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-4 w-56" />
          <Skeleton className="h-3 w-36" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <div className="flex justify-end gap-2">
            <Skeleton className="h-9 w-24" />
            <Skeleton className="h-9 w-28" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
// LearnSessionCardSkeleton: 세션 문제 카드 로딩 시 뼈대를 보여준다.

export default function LearnPage() {
  const sp = useSearchParams()
  const sid = sp.get("sid")
  const router = useRouter()
  const { toast } = useToast()

  const [loading, setLoading] = useState(true)
  const [session, setSession] = useState<LoadedSession | null>(null)
  const [levelStats, setLevelStats] = useState<LevelStats | null>(null)
  const [currentLevel, setCurrentLevel] = useState<number | null>(null)
  const [idx, setIdx] = useState(0)
  const [answer, setAnswer] = useState("")
  const [accessSummary, setAccessSummary] = useState<AccessSummary | null>(null)

  const [submitting, setSubmitting] = useState(false)
  const [feedback, setFeedback] = useState<{ label: string; text: string } | null>(null)
  const [answeredMap, setAnsweredMap] = useState<Record<string, boolean>>({})
  const [questionStartAt, setQuestionStartAt] = useState<number | null>(null)
  const [finalReady, setFinalReady] = useState(false)
  const [completedSent, setCompletedSent] = useState(false)
  const [levelToastSent, setLevelToastSent] = useState(false)

  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        const res = await fetch("/api/entitlements/me", { cache: "no-store" })
        if (!res.ok) return
        const json: AccessSummary = await res.json()
        if (active) setAccessSummary(json)
      } catch (error) {
        console.warn("[learn] failed to load access summary", error)
      }
    })()
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    const load = async () => {
      if (!sid) {
        setLoading(false)
        setSession(null)
        setLevelStats(null)
        setCurrentLevel(null)
        setIdx(0)
        setAnswer("")
        setFeedback(null)
        setAnsweredMap({})
        setQuestionStartAt(null)
        setFinalReady(false)
        setCompletedSent(false)
        setLevelToastSent(false)
        return
      }
      setLoading(true)
      setSession(null)
      setLevelStats(null)
      setCurrentLevel(null)
      setIdx(0)
      setAnswer("")
      setFeedback(null)
      setAnsweredMap({})
      setQuestionStartAt(null)
      setFinalReady(false)
      setCompletedSent(false)
      setLevelToastSent(false)
      try {
        const res = await fetch(`/api/sessions/${encodeURIComponent(sid)}`, { cache: "no-store" })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const json = await res.json()
        const s: LoadedSession | null = json?.session ?? null
        setSession(s)
        setLevelStats(s?.level_snapshot?.stats ?? null)
        setCurrentLevel(
          typeof s?.level_snapshot?.current_level === "number" ? s.level_snapshot.current_level : null
        )
        setIdx(0)
        setAnswer("")
        setFeedback(null)
        setAnsweredMap({})
        setQuestionStartAt(Date.now())
        setLevelToastSent(false)
      } catch (error) {
        console.warn("[learn] failed to load session", error)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [sid])

  useEffect(() => {
    if (sid) return
    let active = true
    ;(async () => {
      try {
        const res = await fetch("/api/level-progress", { cache: "no-store" })
        if (!res.ok) return
        const json = await res.json()
        if (!active) return
        setLevelStats(json?.stats ?? null)
        setCurrentLevel(typeof json?.current_level === "number" ? json.current_level : null)
      } catch {
        if (!active) return
      }
    })()
    return () => {
      active = false
    }
  }, [sid])
  // sid가 없을 때는 별도 레벨 진행 정보를 가져와 카드에 지표를 채운다.

  const current = useMemo(() => {
    if (!session || session.items.length === 0) return null
    return session.items[idx] ?? null
  }, [session, idx])

  useEffect(() => {
    if (current) {
      setQuestionStartAt(Date.now())
    }
  }, [current?.item_id])

    const correctAnswer = current?.snapshot?.answer_en ?? ""
    const showAnswerLine = Boolean(correctAnswer) && !((feedback?.text ?? "").includes(correctAnswer))

  const completeSession = async () => {
    if (!session) return null
    try {
      const res = await fetch(`/api/sessions/${encodeURIComponent(session.session_id)}/complete`, {
        method: "POST",
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json: CompleteResponse = await res.json()
      const leveled = Boolean(json?.level?.leveled_up)
      if (leveled && !levelToastSent) {
        const newLevel = json.level?.new_level
        toast({
          title: "축하합니다!",
          description: newLevel ? `새 레벨 L${newLevel}에 도달했어요.` : "레벨이 상승했습니다!",
        })
        setLevelToastSent(true)
      }
      return json
    } catch (err) {
      console.warn("complete session failed", err)
      return null
    }
  }
  // completeSession: 세션 종료 RPC를 호출하고 승급 여부를 알린다.

  const handleSubmitOne = async () => {
    if (!session || !current || submitting) return
    const itemId = current.item_id
    if ((answeredMap[itemId] ?? false) === true) return

    setSubmitting(true)
    setFeedback(null)
    try {
      const latency = questionStartAt ? Date.now() - questionStartAt : undefined
      const payload = { session_id: session.session_id, item_id: itemId, answer, latency_ms: latency }
      const res = await fetch("/api/attempts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!res.ok) throw new Error("submit_failed")
      const json: SubmitResult = await res.json()
      const r = json?.results?.[0]
      if (r) {
        setFeedback({ label: r.label, text: r.feedback })
      }
      setAnsweredMap((m) => ({ ...m, [itemId]: true }))

      const isLast = session && idx === session.items.length - 1
      if (isLast) {
        setFinalReady(true)
        if (!completedSent) {
          setCompletedSent(true)
          await completeSession()
        }
      }
    } catch (e) {
      console.error(e)
      alert("제출 중 오류가 발생했습니다.")
    } finally {
      setSubmitting(false)
    }
  }
  // handleSubmitOne: 단일 문항 제출을 처리한다.

  const handleSkip = async () => {
    if (!session || !current || submitting) return
    const itemId = current.item_id
    const already = answeredMap[itemId] === true

    if (already) {
      goNextOrFinish()
      return
    }

    setSubmitting(true)
    try {
      const latency = questionStartAt ? Date.now() - questionStartAt : undefined
      const payload = { session_id: session.session_id, item_id: itemId, answer: "", latency_ms: latency }
      const res = await fetch("/api/attempts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error("skip_failed")
      setAnsweredMap((m) => ({ ...m, [itemId]: true }))
      setFeedback(null)
      goNextOrFinish()
    } catch (e) {
      console.error(e)
      alert("건너뛰기 처리 중 오류가 발생했습니다.")
    } finally {
      setSubmitting(false)
    }
  }
  // handleSkip: 정답 제출 없이 다음 문제로 이동한다.

  const goNextOrFinish = async () => {
    if (!session) return
    const lastIndex = session.items.length - 1
    if (idx < lastIndex) {
      setIdx((i) => i + 1)
      setAnswer("")
      setFeedback(null)
      setFinalReady(false)
      setCompletedSent(false)
      setQuestionStartAt(Date.now())
    } else {
      await completeSession()
      router.push(`/result?sid=${encodeURIComponent(session.session_id)}`)
    }
  }
  // goNextOrFinish: 다음 문항 또는 결과 페이지로 이동한다.

  const progressText = useMemo(() => {
    if (!session) return ""
    return `${idx + 1} / ${session.items.length}`
  }, [session, idx])

  const showLoading = loading
  const showStartCard = !loading && (!sid || !session || (session.items?.length ?? 0) === 0)
  const showSession = !loading && Boolean(session && current)

  return (
    <ProtectedRoute>
      <AppLayout>

        <div className="max-w-3xl mx-auto space-y-6 p-4">
          {showLoading && (
            <div className="space-y-4">
              <LoadingState
                size="compact"
                title="학습 세션을 준비하고 있어요"
                message="조금만 기다려 주세요. 여러분의 학습 데이터를 가져오는 중입니다."
              />
              {sid ? (
                <LearnSessionCardSkeleton />
              ) : (
                <div className="max-w-md mx-auto">
                  <StartLearningPlaceholderSkeleton />
                </div>
              )}
            </div>

          )}

          {showStartCard && (
            <div className="max-w-md mx-auto">
              <StartLearningCard
                preferResumeLabel
                accessSummary={accessSummary}
                totalSentenceCount={0}
                levelStats={levelStats}
                currentLevel={currentLevel}
              />
            </div>
          )}

          {showSession && (
            <>
              <SessionStartAlert currentLevel={currentLevel} stats={levelStats} />
              <div className="flex items-center justify-between">
                <h1 className="text-xl font-bold">학습 세션 (단건 제출)</h1>
                <div className="text-sm text-muted-foreground">진행: {progressText}</div>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Q{current.order_index}. {current.snapshot?.source_ko}</CardTitle>
                  <CardDescription>정답을 입력해 주세요.</CardDescription>
                  {(current?.level ?? current?.snapshot?.level) ? (
                    <div className="text-xs text-muted-foreground">
                      문제 레벨: <span className="font-semibold text-foreground">{current?.level ?? current?.snapshot?.level}</span>
                    </div>
                  ) : null}
                </CardHeader>
                <CardContent className="space-y-3">
                  <Input
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                    placeholder="정답을 입력하세요"
                    disabled={submitting || answeredMap[current.item_id] === true}
                  />

                  {answeredMap[current.item_id] !== true && (
                    <div className="flex justify-end gap-2">
                      <Button variant="secondary" onClick={handleSkip} disabled={submitting}>
                        건너뛰기
                      </Button>
                      <Button onClick={handleSubmitOne} disabled={submitting}>
                        {submitting ? "제출 중..." : "제출하기"}
                      </Button>
                    </div>
                  )}

                  {answeredMap[current.item_id] === true && (
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 text-sm">
                        {feedback && (
                          <>
                            {feedback.label === "correct"
                              ? "정답"
                              : feedback.label === "variant"
                              ? "정답(허용 표현)"
                              : feedback.label === "near_miss"
                              ? "근접 정답"
                              : "오답"}
                            <div className="mt-1 text-muted-foreground">{feedback.text}</div>
                            {showAnswerLine ? (
                              <div className="mt-1 text-muted-foreground">
                                정답: <b className="text-foreground">{current.snapshot?.answer_en}</b>
                              </div>
                            ) : null}
                            {current.concept_ko && (
                              <div className="text-muted-foreground">
                                개념: <b className="text-foreground">{current.concept_ko}</b>
                                {current.concept_key ? ` (${current.concept_key})` : ""}
                              </div>
                            )}
                          </>
                        )}
                      </div>
                      <div className="shrink-0">
                        {idx === (session?.items.length ?? 0) - 1 ? (
                          <Button
                            variant="default"
                            onClick={async () => {
                              if (!completedSent) {
                                setCompletedSent(true)
                                await completeSession()
                              }
                              router.push(`/result?sid=${encodeURIComponent(session!.session_id)}`)
                            }}
                          >
                            종합 결과 보기
                          </Button>
                        ) : (
                          <Button variant="default" onClick={goNextOrFinish}>
                            다음
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </AppLayout>
    </ProtectedRoute>
  )
}
// LearnPage: 학습 세션을 진행하고 완료 시 결과 페이지로 이동한다.

// 사용법: /learn 경로에서 sid 쿼리 파라미터와 함께 접근한다.
