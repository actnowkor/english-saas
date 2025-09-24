// 경로: app/dashboard/page.tsx
// 역할: 대시보드 메인 화면(레벨 카드, 통계, 캘린더, 추천 개념)
// 의존관계: hooks/use-dashboard.ts, components/dashboard/*
// 포함 함수: DashboardPage()

"use client"

import { useEffect, useMemo, useState } from "react"
import { AppLayout } from "@/components/layout/app-layout"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { useDashboard } from "@/hooks/use-dashboard"
import { LevelCard } from "@/components/dashboard/level-card"
import { MetricCard } from "@/components/dashboard/metric-card"
import { CalendarMonth } from "@/components/dashboard/calendar-month"
import { StartLearningCard } from "@/components/dashboard/start-learning-card"
import { ChevronLeft, ChevronRight, Trophy, Target, TrendingUp } from "lucide-react"
import type { AccessSummary } from "@/lib/payments/access-summary"

type RankItem = {
  key: string
  name: string
  reason?: string
  score?: number
  trend?: "up" | "down" | "flat"
}

/** 관리자 신호를 카드가 기대하는 형태로 보정 */
function normalizeAccessForCard(
  access: AccessSummary | (Record<string, any> & Partial<AccessSummary>) | null | undefined
): AccessSummary | null {
  if (!access) return null
  const base = access as AccessSummary & { is_admin?: boolean; role?: string }
  const isAdmin = base.reason === "OK_ADMIN" || base.is_admin === true || base.role === "admin"
  if (!isAdmin) return base
  return {
    ...base,
    reason: "OK_ADMIN",
    status: "pro",
    free_sessions_left: Number.MAX_SAFE_INTEGER,
    free_sessions_limit: Number.MAX_SAFE_INTEGER,
  } as AccessSummary
}

export default function DashboardPage() {
  const { loading, error, data } = useDashboard()

  // ✅ learn 페이지처럼 entitlements를 1회 더 조회해 관리자 신호를 확보
  const [entitlement, setEntitlement] = useState<AccessSummary | null>(null)
  useEffect(() => {
    let live = true
    ;(async () => {
      try {
        const res = await fetch("/api/entitlements/me", { cache: "no-store" })
        if (!res.ok) return
        const json: AccessSummary = await res.json()
        if (live) setEntitlement(json)
      } catch {}
    })()
    return () => { live = false }
  }, [])

  // ✅ 카드에 줄 최종 access: entitlements가 관리자면 그걸 우선, 아니면 대시보드 access 보정본
  const accessForCard: AccessSummary | null =
    entitlement?.reason === "OK_ADMIN"
      ? normalizeAccessForCard(entitlement)
      : normalizeAccessForCard(data?.access) // 기존 로직 유지 (파일 원본 구조는 동일)  :contentReference[oaicite:3]{index=3}


  const [ym, setYm] = useState<{ year: number; month: number } | null>(null)
  const [learnedDates, setLearnedDates] = useState<string[]>([])
  const [calLoading, setCalLoading] = useState(false)

  useEffect(() => {
    if (!data) return
    const { year, month, learnedDates } = data.calendar
    setYm({ year, month })
    setLearnedDates(learnedDates)
  }, [data])

  const shiftMonth = (year: number, month: number, delta: number) => {
    const base = new Date(year, month - 1, 1)
    base.setMonth(base.getMonth() + delta)
    return { year: base.getFullYear(), month: base.getMonth() + 1 }
  }

  const isDefaultMonth = useMemo(() => {
    if (!data || !ym) return false
    return data.calendar.year === ym.year && data.calendar.month === ym.month
  }, [data, ym])

  const fetchMonth = async (year: number, month: number) => {
    if (!data) return
    if (isDefaultMonth) {
      setLearnedDates(data.calendar.learnedDates)
      return
    }
    setCalLoading(true)
    try {
      const res = await fetch(`/api/calendar?year=${year}&month=${month}`, { cache: "no-store" })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      setLearnedDates(json.learnedDates ?? [])
    } catch {
      setLearnedDates([])
    } finally {
      setCalLoading(false)
    }
  }

  const goPrev = () => {
    if (!ym) return
    const nextYm = shiftMonth(ym.year, ym.month, -1)
    setYm(nextYm)
  }

  const goNext = () => {
    if (!ym) return
    const nextYm = shiftMonth(ym.year, ym.month, 1)
    setYm(nextYm)
  }

  useEffect(() => {
    if (!ym || !data) return
    fetchMonth(ym.year, ym.month)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ym?.year, ym?.month, data])

  if (loading) {
    return (
      <ProtectedRoute>
        <AppLayout>
          <div className="space-y-6">
            <div>
              <Skeleton className="h-8 w-48 mb-2" />
              <Skeleton className="h-4 w-96" />
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, idx) => (
                <Card key={idx}>
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
            <div className="grid gap-6 md:grid-cols-2">
              <Card className="h-[220px]">
                <CardHeader>
                  <Skeleton className="h-5 w-40" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-[120px] w-full" />
                </CardContent>
              </Card>
              <Card className="h-[220px]">
                <CardHeader>
                  <Skeleton className="h-5 w-40" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-[120px] w-full" />
                </CardContent>
              </Card>
            </div>
          </div>
        </AppLayout>
      </ProtectedRoute>
    )
  }

  if (error || !data || !ym) {
    return (
      <ProtectedRoute>
        <AppLayout>
          <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
            <p className="text-muted-foreground">대시보드 데이터를 불러오지 못했습니다.</p>
            <Button onClick={() => location.reload()}>다시 시도</Button>
          </div>
        </AppLayout>
      </ProtectedRoute>
    )
  }

  const { level, delta30d, totalSentenceCount, studiedWordCount, priorityConcepts, gates, levelMeta, progress } = data
  const statsForCard = progress?.stats ?? levelMeta?.stats ?? null
  const monthLabel = `${ym.year}년 ${String(ym.month).padStart(2, "0")}월`

  const rankList: RankItem[] = priorityConcepts.map((item, idx) => ({
    key: item.key || `concept_${idx + 1}`,
    name: item.name || `개념 ${idx + 1}`,
    reason: item.reason,
    score: item.score,
    trend: item.trend,
  }))

  return (
    <ProtectedRoute>
      <AppLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">학습 대시보드</h1>
            <p className="text-muted-foreground">오늘도 꾸준한 학습을 이어가 보세요.</p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <LevelCard
              level={level}
              delta30d={delta30d}
              eligible={Boolean(levelMeta?.eligibleForNext)}
              reason={levelMeta?.reason ?? "승급 평가 정보를 불러왔습니다."}
              targetLevel={levelMeta?.targetLevel ?? level + 1}
              stats={levelMeta?.stats ?? null}
              policy={levelMeta?.policy ?? null}
            />
            <MetricCard title="작성한 문장 수" value={totalSentenceCount} tooltip="세션에서 학습자가 직접 작성하거나 복습한 문장 수" />
            <MetricCard title="학습한 어휘 수" value={studiedWordCount} tooltip="문장 외에 학습한 단어 또는 구절 개수" />
            <StartLearningCard
              disabledWeakSession={!gates.weakSessionEnabled}
              levelStats={statsForCard}
              currentLevel={progress?.currentLevel ?? level}
              accessSummary={accessForCard}  // ✅ 보정된 access 전달 (관리자 신호 포함)
              totalSentenceCount={totalSentenceCount}
            />
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>최근 학습 캘린더</CardTitle>
                  <CardDescription>학습이 진행된 날짜를 한눈에 확인하세요.</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="icon" onClick={goPrev} disabled={calLoading} aria-label="이전 달">
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm tabular-nums w-[100px] text-center">{monthLabel}</span>
                  <Button variant="outline" size="icon" onClick={goNext} disabled={calLoading} aria-label="다음 달">
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {calLoading ? <Skeleton className="h-[220px] w-full" /> : <CalendarMonth year={ym.year} month={ym.month} learnedDates={learnedDates} />}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div className="flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-amber-500" />
                  <div>
                    <CardTitle>추천 학습 개념 Top5</CardTitle>
                    <CardDescription>최근 성과를 기반으로 우선순위를 제안합니다.</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <ol className="divide-y">
                  {rankList.map((item, idx) => (
                    <li key={item.key} className="py-3">
                      <div className="flex items-start gap-3">
                        <div
                          className={[
                            "h-8 w-8 shrink-0 grid place-items-center rounded-full text-sm font-semibold text-white",
                            idx === 0
                              ? "bg-amber-500"
                              : idx === 1
                              ? "bg-gray-500"
                              : idx === 2
                              ? "bg-orange-400"
                              : "bg-muted-foreground",
                          ].join(" ")}
                          aria-label={`${idx + 1}위`}
                          title={`${idx + 1}위`}
                        >
                          {idx + 1}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-3">
                            <p className="font-medium truncate">{item.name}</p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              {typeof item.score === "number" && (
                                <span className="inline-flex items-center gap-1">
                                  <Target className="h-3 w-3" />
                                  {Math.round(item.score)}
                                </span>
                              )}
                              {item.trend && (
                                <span className="inline-flex items-center gap-1">
                                  <TrendingUp
                                    className={`h-3 w-3 ${
                                      item.trend === "up"
                                        ? "text-green-600"
                                        : item.trend === "down"
                                        ? "rotate-180 text-red-600"
                                        : "text-muted-foreground"
                                    }`}
                                  />
                                  {item.trend === "up" ? "상승" : item.trend === "down" ? "하락" : "유지"}
                                </span>
                              )}
                            </div>
                          </div>
                          {item.reason && <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{item.reason}</p>}
                        </div>
                      </div>
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>
          </div>
        </div>
      </AppLayout>
    </ProtectedRoute>
  )
}
