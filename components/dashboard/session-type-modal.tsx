// 경로: components/dashboard/session-type-modal.tsx
// 역할: 학습 시작 전 세션 타입을 선택하고 제한 조건을 안내한다.
// 의존관계: lib/i18n
// 포함 함수: SessionTypeModal()

"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useTranslation } from "@/lib/i18n"

type SessionType = "standard" | "review_only" | "new_only" | "weakness"

type SessionTypeModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onStartSession: (type: SessionType) => void
  totalSentenceCount: number
  preselectedType?: SessionType
  difficultyNotice?: {
    applied: boolean
    reason: string
    policy_level?: number | null
    recent_correct_rate?: number | null
    low_box_concept_count?: number | null
  }
}

const SESSION_TYPES: SessionType[] = ["new_only", "standard", "review_only", "weakness"]

export function SessionTypeModal({
  open,
  onOpenChange,
  onStartSession,
  totalSentenceCount,
  preselectedType,
  difficultyNotice,
}: SessionTypeModalProps) {
  const { t } = useTranslation()
  const [selectedType, setSelectedType] = useState<SessionType>(preselectedType || "new_only")
  const eligible = (totalSentenceCount ?? 0) >= 300

  const handleStart = () => {
    onStartSession(selectedType)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-lg space-y-3">
        <DialogHeader>
          <DialogTitle>{t("sessionType.title")}</DialogTitle>
          <DialogDescription>학습 방식에 맞는 옵션을 골라 주세요.</DialogDescription>
        </DialogHeader>

        {!eligible && (
          <Alert variant="destructive">
            <AlertDescription>300문제 이상 학습해야 다른 세션을 열 수 있습니다.</AlertDescription>
          </Alert>
        )}

        {difficultyNotice && (
          <Alert variant={difficultyNotice.applied ? "destructive" : "default"}>
            <AlertDescription>
              {difficultyNotice.applied
                ? `이미 세션에 ${difficultyNotice.reason || "난이도 조정"}이 적용되었습니다.`
                : `난이도 참고: ${difficultyNotice.reason || "추가 조정 없음"}`}
              <span className="mt-1 block text-xs text-muted-foreground">
                최근 정답률 {typeof difficultyNotice.recent_correct_rate === "number"
                  ? `${Math.round(difficultyNotice.recent_correct_rate * 100)}%`
                  : "-"}
                , 낮은 박스 {typeof difficultyNotice.low_box_concept_count === "number"
                  ? difficultyNotice.low_box_concept_count.toLocaleString()
                  : "-"}
                {typeof difficultyNotice.policy_level === "number"
                  ? ` · 정책 레벨 L${difficultyNotice.policy_level}`
                  : ""}
              </span>
            </AlertDescription>
          </Alert>
        )}

        <div className="grid gap-2.5 sm:gap-3">
          {SESSION_TYPES.map((sessionType) => {
            const isSelected = selectedType === sessionType
            const disabled = !eligible && sessionType !== "new_only"
            return (
              <Card
                key={sessionType}
                className={`cursor-pointer transition-colors ${
                  disabled
                    ? "opacity-50 pointer-events-none"
                    : isSelected
                    ? "ring-2 ring-primary"
                    : "hover:bg-muted/50"
                }`}
                onClick={() => {
                  if (disabled) return
                  setSelectedType(sessionType)
                }}
              >
                <CardHeader className="pb-2.5">
                  <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between">
                    <CardTitle className="text-sm sm:text-base">
                      {t(`sessionType.${sessionType}.title`)}
                    </CardTitle>
                  </div>
                  <CardDescription className="text-left text-xs sm:text-sm">
                    {t(`sessionType.${sessionType}.desc`)}
                  </CardDescription>
                </CardHeader>
              </Card>
            )
          })}
        </div>

        <div className="flex flex-col-reverse gap-2 pt-3 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full sm:w-auto">
            {t("sessionType.cancel_button")}
          </Button>
          <Button onClick={handleStart} className="w-full sm:w-auto" disabled={!eligible && selectedType !== "new_only"}>
            {t("sessionType.start_button")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
// SessionTypeModal: 학습 시작 시 세션 타입 선택과 제한 안내 UI를 제공한다.
// 사용법: StartLearningCard에서 학습 가능한 총 풀이 수와 함께 호출한다.
