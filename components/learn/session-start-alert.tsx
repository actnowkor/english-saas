// 경로: components/learn/session-start-alert.tsx
// 역할: 학습 시작 시 현재 레벨과 최근 학습 지표를 안내한다.
// 의존관계: components/ui/alert, lib/logic/level-utils.ts
// 포함 함수: SessionStartAlert()

"use client"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import type { LevelStats } from "@/lib/logic/level-utils"
import { Gauge, Sparkles } from "lucide-react"

export function SessionStartAlert({
  currentLevel,
  stats,
}: {
  currentLevel?: number | null
  stats?: LevelStats | null
}) {
  const levelLabel = typeof currentLevel === "number" ? `L${currentLevel}` : "기본"

  if (!stats) {
    return (
      <Alert>
        <AlertTitle className="flex items-center gap-2">
          <Sparkles className="h-4 w-4" /> {levelLabel} 난이도로 시작합니다
        </AlertTitle>
        <AlertDescription>최근 지표가 충분하지 않아 기본 난이도를 유지합니다.</AlertDescription>
      </Alert>
    )
  }

  const recentRate = typeof stats.recent_correct_rate === "number" ? `${Math.round(stats.recent_correct_rate * 100)}%` : "-"
  const lowBox =
    typeof stats.low_box_concept_count === "number" ? stats.low_box_concept_count.toLocaleString() : "-"
  const stableRatio =
    typeof stats.stable_concept_ratio === "number" ? `${Math.round(stats.stable_concept_ratio * 100)}%` : "-"

  return (
    <Alert>
      <AlertTitle className="flex items-center gap-2">
        <Gauge className="h-4 w-4" /> {levelLabel} 난이도로 학습 중
      </AlertTitle>
      <AlertDescription>
        최근 정답률 {recentRate}, 익숙한 개념 비중 {stableRatio}, 학습중인 개념 {lowBox} 정보를 기반으로 편안한 학습을 준비했어요.
      </AlertDescription>
    </Alert>
  )
}
// SessionStartAlert: 현재 레벨과 레벨 업을 위한 핵심 지표를 안내한다.

// 사용법: 학습 페이지에서 세션 데이터를 불러온 뒤 전달한다.

