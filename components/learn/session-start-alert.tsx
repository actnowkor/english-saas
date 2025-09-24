// 경로: components/learn/session-start-alert.tsx
// 역할: 학습 시작 시 난이도 조정 안내 배너 표시
// 의존관계: components/ui/alert, lib/logic/level-utils.ts
// 포함 함수: SessionStartAlert()

"use client"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import type { StrategyAdjustment } from "@/lib/logic/level-utils"
import { Gauge, Sparkles } from "lucide-react"

export function SessionStartAlert({ adjustment }: { adjustment: StrategyAdjustment }) {
  if (!adjustment) return null

  if (!adjustment.applied) {
    return (
      <Alert>
        <AlertTitle className="flex items-center gap-2">
          <Sparkles className="h-4 w-4" /> 현재 난이도 유지 중
        </AlertTitle>
        <AlertDescription>
          최근 학습 성과가 안정적이라 평소 난이도로 진행합니다.
        </AlertDescription>
      </Alert>
    )
  }

  const recentRate =
    typeof adjustment.recent_correct_rate === "number"
      ? `${Math.round(adjustment.recent_correct_rate * 100)}%`
      : null
  const lowBox =
    typeof adjustment.low_box_concept_count === "number"
      ? adjustment.low_box_concept_count.toLocaleString()
      : null
  const policyLevel =
    typeof adjustment.policy_level === "number" ? `L${adjustment.policy_level}` : null

  return (
    <Alert variant="destructive">
      <AlertTitle className="flex items-center gap-2">
        <Gauge className="h-4 w-4" /> 난이도 조정 적용
      </AlertTitle>
      <AlertDescription>
        {adjustment.reason || "최근 성과를 기준으로 한 단계 낮은 난이도로 구성했어요."}
        <span className="mt-1 block text-xs text-muted-foreground">
          최근 정답률 {recentRate ?? "-"}, 낮은 박스 개념수 {lowBox ?? "-"}
          {policyLevel ? ` · 정책 레벨 ${policyLevel}` : ""}
        </span>
      </AlertDescription>
    </Alert>
  )
}
// SessionStartAlert: 세션 전략 정보를 읽어 난이도 메시지를 보여준다.

// 사용법: 학습 페이지에서 세션 데이터를 불러온 뒤 전달한다.

