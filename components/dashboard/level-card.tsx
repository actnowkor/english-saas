// 경로: components/dashboard/level-card.tsx
// 역할: 대시보드 현재 레벨과 승급 상태를 보여주는 카드
// 의존관계: hooks/use-dashboard.ts, lucide-react
// 포함 함수: LevelCard()

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowUp, ArrowDown, Minus, Sparkles } from "lucide-react"

export function LevelCard({
  level,
  delta30d,
  eligible,
  reason,
  targetLevel,
}: {
  level: number
  delta30d: number
  eligible: boolean
  reason: string
  targetLevel: number
}) {
  const DeltaIcon = delta30d > 0 ? ArrowUp : delta30d < 0 ? ArrowDown : Minus
  const deltaColor =
    delta30d > 0
      ? "text-green-600 dark:text-green-400"
      : delta30d < 0
      ? "text-red-600 dark:text-red-400"
      : "text-muted-foreground"

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
      </CardContent>
    </Card>
  )
}
// LevelCard: 레벨 수치와 승급 상태를 시각적으로 보여준다.

// 사용법: 대시보드 페이지에서 levelMeta 데이터를 전달해 렌더링한다.
