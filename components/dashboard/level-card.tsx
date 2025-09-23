// 경로: components/dashboard/level-card.tsx
// 역할: 대시보드 현재 레벨과 승급 상태를 보여주는 카드
// 의존관계: hooks/use-dashboard.ts, lucide-react
// 포함 함수: LevelCard()

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowUp, ArrowDown, Minus, Sparkles } from "lucide-react"
import type { LevelStats, LevelUpPolicy } from "@/lib/logic/level-utils"

export function LevelCard({
  level,
  delta30d,
  eligible,
  reason,
  targetLevel,
  stats,
  policy,
}: {
  level: number
  delta30d: number
  eligible: boolean
  reason: string
  targetLevel: number
  stats: LevelStats | null
  policy: LevelUpPolicy | null
}) {
  const DeltaIcon = delta30d > 0 ? ArrowUp : delta30d < 0 ? ArrowDown : Minus
  const deltaColor =
    delta30d > 0
      ? "text-green-600 dark:text-green-400"
      : delta30d < 0
      ? "text-red-600 dark:text-red-400"
      : "text-muted-foreground"

  const formatPercent = (value: number | null | undefined) => {
    if (value == null || Number.isNaN(value)) return "-"
    return `${Math.round(Number(value) * 100)}%`
  }
  // formatPercent: 비율 값을 퍼센트 문자열로 변환한다.

  const formatCount = (value: number | null | undefined) => {
    if (value == null || Number.isNaN(value)) return "-"
    return value.toLocaleString()
  }
  // formatCount: 카운트 값을 천 단위 구분 기호와 함께 보여준다.

  const hasGoalData = Boolean(
    stats || (policy && (policy.min_correct_rate != null || policy.min_total_attempts != null))
  )

  const recentRate = stats?.recent_correct_rate ?? null
  const requiredRate = policy?.min_correct_rate ?? null
  const totalAttempts = stats?.total_attempts ?? null
  const requiredAttempts = policy?.min_total_attempts ?? null
  const stableRatio = stats?.stable_concept_ratio ?? null
  const requiredRatio = policy?.min_box_level_ratio ?? null

  return (
    <Card>
      <CardHeader className="pb-2 space-y-2">
        <div className="flex items-center justify-between">
          <CardTitle>현재 레벨</CardTitle>
          {eligible ? (
            <Badge className="gap-1" variant="secondary">
              <Sparkles className="h-3.5 w-3.5" /> 승급 준비 완료
            </Badge>
          ) : (
            <Badge variant="outline">다음 목표 L{targetLevel}</Badge>
          )}
        </div>
        <CardDescription>최근 30일 변동과 승급 기준을 안내합니다.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <div className="flex items-end justify-between">
          <div className="text-3xl font-bold">L{level}</div>
          <div className={`flex items-center gap-1 ${deltaColor}`}>
            <DeltaIcon className="h-4 w-4" />
            <span className="text-sm">{delta30d > 0 ? `+${delta30d}` : delta30d}</span>
          </div>
        </div>
        <p className="text-sm text-muted-foreground leading-snug">{reason || "최근 평가 정보를 불러왔습니다."}</p>
        <div className="mt-2 rounded-md border border-dashed border-muted p-3 bg-muted/30">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            다음 목표
          </p>
          {hasGoalData ? (
            <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">최근 정확도</dt>
                <dd className="text-right tabular-nums">
                  <span>{formatPercent(recentRate)}</span>
                  <span className="ml-1 text-xs text-muted-foreground">
                    / {formatPercent(requiredRate)}
                  </span>
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">누적 시도 수</dt>
                <dd className="text-right tabular-nums">
                  <span>{formatCount(totalAttempts)}</span>
                  <span className="ml-1 text-xs text-muted-foreground">
                    / {formatCount(requiredAttempts)}
                  </span>
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">안정된 개념 비율</dt>
                <dd className="text-right tabular-nums">
                  <span>{formatPercent(stableRatio)}</span>
                  <span className="ml-1 text-xs text-muted-foreground">
                    / {formatPercent(requiredRatio)}
                  </span>
                </dd>
              </div>
            </dl>
          ) : (
            <p className="mt-2 text-xs text-muted-foreground">
              아직 충분한 학습 기록이 없어 다음 목표를 계산할 수 없습니다.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
// LevelCard: 레벨 수치와 승급 상태를 시각적으로 보여준다.

// 사용법: 대시보드 페이지에서 levelMeta 데이터를 전달해 렌더링한다.
