// 경로: app/dashboard/page.tsx
// 역할: 대시보드 메인 화면(레벨 카드, 통계, 캘린더, 추천 개념)
// 의존관계: hooks/use-dashboard.ts, components/dashboard/*
// 포함 함수: LevelCardSkeleton(), MetricCardSkeleton(), StartLearningCardSkeleton(), PriorityConceptSkeletonList(), DashboardPage()

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
// normalizeAccessForCard: 관리자 계정이면 무제한 권한으로 보정한다.

function LevelCardSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-2 space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-3 w-48" />
      </CardHeader>
      <CardContent className="space-y-3">
        <Skeleton className="h-10 w-16" />
        <Skeleton className="h-4 w-40" />
        <div className="space-y-2 rounded-md border border-dashed border-muted p-3">
          {Array.from({ length: 3 }).map((_, idx) => (
            <div key={idx} className="flex items-center justify-between">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-3 w-28" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
// LevelCardSkeleton: 현재 레벨 카드의 로딩 상태를 표현한다.

function MetricCardSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-2 space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-3 w-40" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-10 w-20" />
      </CardContent>
    </Card>
  )
}
// MetricCardSkeleton: 대시보드 지표 카드의 로딩 상태를 보여준다.

function StartLearningCardSkeleton() {
  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader className="pb-3 space-y-2">
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
// StartLearningCardSkeleton: 학습 시작 카드의 로딩 모습을 구성한다.

function PriorityConceptSkeletonList() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, idx) => (
        <div key={idx} className="flex items-start gap-3">
          <Skeleton className="h-8 w-8 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
      ))}
    </div>
  )
}
// PriorityConceptSkeletonList: 추천 개념 목록의 로딩 상태를 채운다.

export default function DashboardPage() {
  const { loading, error, data } = useDashboard()

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
    return () => {
      live = false
    }
  }, [])

  const accessForCard =
    entitlement?.reason === "OK_ADMIN"
      ? normalizeAccessForCard(entitlement)
      : normalizeAccessForCard(data?.access)
  // accessForCard: 관리자 보정을 거친 학습 카드 접근 권한이다.

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
  // shiftMonth: 월 이동을 계산해 새 연월을 반환한다.

  const isDefaultMonth = useMemo(() => {
    if (!data || !ym) return false
    return data.calendar.year === ym.year && data.calendar.month === ym.month
  }, [data, ym])
  // isDefaultMonth: 현재 선택된 달이 기본 응답과 동일한지 판단한다.

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
  // fetchMonth: 다른 월의 학습 일자를 서버에서 불러온다.

  const goPrev = () => {
    if (!ym) return
    const nextYm = shiftMonth(ym.year, ym.month, -1)
    setYm(nextYm)
  }
  // goPrev: 이전 달로 이동한다.

  const goNext = () => {
    if (!ym) return
    const nextYm = shiftMonth(ym.year, ym.month, 1)
    setYm(nextYm)
  }
  // goNext: 다음 달로 이동한다.

  useEffect(() => {
    if (!ym || !data) return
    fetchMonth(ym.year, ym.month)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ym?.year, ym?.month, data])

  if (!loading && (error || !data || !ym)) {
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

  const ready = !loading && Boolean(data) && Boolean(ym)
  const level = data?.level ?? 0
  const delta30d = data?.delta30d ?? 0
  const totalSentenceCount = data?.totalSentenceCount ?? 0
  const studiedWordCount = data?.studiedWordCount ?? 0
  const gates = data?.gates ?? { weakSessionEnabled: false }
  const levelMeta = data?.levelMeta ?? null
  const progress = data?.progress ?? null
  const statsForCard = progress?.stats ?? levelMeta?.stats ?? null
  const monthLabel = ym ? `${ym.year}년 ${String(ym.month).padStart(2, "0")}월` : ""

  const rankList: RankItem[] = (data?.priorityConcepts ?? []).map((item, idx) => ({
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
            {ready ? (
              <LevelCard
                level={level}
                delta30d={delta30d}
                eligible={Boolean(levelMeta?.eligibleForNext)}
                reason={levelMeta?.reason ?? "승급 평가 정보를 불러왔습니다."}
                targetLevel={levelMeta?.targetLevel ?? level + 1}
                stats={levelMeta?.stats ?? null}
                policy={levelMeta?.policy ?? null}
              />
            ) : (
              <LevelCardSkeleton />
            )}

            {ready ? (
              <MetricCard
                title="작성한 문장 수"
                value={totalSentenceCount}
                tooltip="세션에서 학습자가 직접 작성하거나 복습한 문장 수"
              />
            ) : (
              <MetricCardSkeleton />
            )}

            {ready ? (
              <MetricCard
                title="학습한 어휘 수"
                value={studiedWordCount}
                tooltip="문장 외에 학습한 단어 또는 구절 개수"
              />
            ) : (
              <MetricCardSkeleton />
            )}

            {ready ? (
              <StartLearningCard
                disabledWeakSession={!gates.weakSessionEnabled}
                levelStats={statsForCard}
                currentLevel={progress?.currentLevel ?? level}
                accessSummary={accessForCard}
                totalSentenceCount={totalSentenceCount}
              />
            ) : (
              <StartLearningCardSkeleton />
            )}
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>최근 학습 캘린더</CardTitle>
                  <CardDescription>학습이 진행된 날짜를 한눈에 확인하세요.</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="icon" onClick={goPrev} disabled={calLoading || !ready} aria-label="이전 달">
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  {ready ? (
                    <span className="text-sm tabular-nums w-[100px] text-center">{monthLabel}</span>
                  ) : (
                    <Skeleton className="h-4 w-[100px]" />
                  )}
                  <Button variant="outline" size="icon" onClick={goNext} disabled={calLoading || !ready} aria-label="다음 달">
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {ready ? (
                  calLoading ? (
                    <Skeleton className="h-[220px] w-full" />
                  ) : (
                    <CalendarMonth year={ym.year} month={ym.month} learnedDates={learnedDates} />
                  )
                ) : (
                  <Skeleton className="h-[220px] w-full" />
                )}
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
                {ready ? (
                  rankList.length > 0 ? (
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
                  ) : (
                    <p className="text-sm text-muted-foreground">추천할 개념이 아직 없어요. 학습을 이어가 주세요!</p>
                  )
                ) : (
                  <PriorityConceptSkeletonList />
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </AppLayout>
    </ProtectedRoute>
  )
}
// DashboardPage: 대시보드 전반을 구성하고 카드별 로딩을 제어한다.
