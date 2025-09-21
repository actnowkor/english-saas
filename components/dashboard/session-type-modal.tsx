// 경로: components/dashboard/session-type-modal.tsx
// 역할: 학습 세션 종류 선택 모달
// 의존관계: lib/i18n, hooks/use-dashboard.ts
// 포함 함수: SessionTypeModal()

"use client"

import { useState, useEffect } from "react"
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
  preselectedType?: SessionType
  difficultyNotice?: { applied: boolean; reason: string } | undefined
}

const SESSION_TYPES: SessionType[] = ["new_only", "standard", "review_only", "weakness"]

export function SessionTypeModal({
  open,
  onOpenChange,
  onStartSession,
  preselectedType,
  difficultyNotice,
}: SessionTypeModalProps) {
  const { t } = useTranslation()
  const [eligible, setEligible] = useState<boolean>(true)
  const [selectedType, setSelectedType] = useState<SessionType>(preselectedType || "new_only")

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const res = await fetch("/api/dashboard", { cache: "no-store" })
        if (!res.ok) return
        const json = await res.json()
        const total = Number(json?.totalSentenceCount ?? 0)
        if (mounted) setEligible(total >= 300)
      } catch {}
    })()
    return () => {
      mounted = false
    }
  }, [])

  const handleStart = () => {
    onStartSession(selectedType)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-lg space-y-3">
        <DialogHeader>
          <DialogTitle>{t("sessionType.title")}</DialogTitle>
          <DialogDescription>학습 목적에 맞는 세션을 선택해 주세요.</DialogDescription>
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
                ? `이번 세션은 ${difficultyNotice.reason || "정답률 저하"} 기준으로 난이도가 조정됩니다.`
                : `난이도 조정 없음: ${difficultyNotice.reason || "안정적으로 유지 중"}`}
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
// SessionTypeModal: 학습 시작 전에 세션 타입과 조정 안내를 선택한다.

// 사용법: StartLearningCard에서 모달 상태와 시작 핸들러를 주입한다.