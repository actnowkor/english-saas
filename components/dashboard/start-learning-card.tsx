// 경로: components/dashboard/start-learning-card.tsx
// 역할: 학습 시작 카드와 이용 제한 안내를 담당
// 의존관계: components/dashboard/session-type-modal.tsx, app/api/learn/check, app/api/sessions
// 포함 함수: StartLearningCard()

"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Play } from "lucide-react"
import { SessionTypeModal } from "@/components/dashboard/session-type-modal"
import type { AccessSummary } from "@/lib/payments/access-summary"

type SessionType = "standard" | "review_only" | "new_only" | "weakness"

type LearnCheckResponse = {
  can_start: boolean
  reason: "OK_WITH_PRO" | "OK_WITH_FREE" | "NO_FREE_LEFT" | string
  pro_until?: string | null
}

type AccessBadge = {
  label: string
  variant: "default" | "secondary" | "destructive"
}

function formatBadgeDate(value: string | null | undefined) {
  if (!value) return "-"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "-"
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}.${month}.${day}`
}
// formatBadgeDate: 배지를 위한 만료일 문자열을 YYYY.MM.DD 형태로 변환한다.

function buildAccessBadge(access?: AccessSummary | null): AccessBadge | null {
  if (!access) return null
  if (access.status === "pro") {
    const until = formatBadgeDate(access.pro_until)
    return { label: `무제한 이용권 ~${until}`, variant: "default" }
  }
  const limit = Math.max(1, Number(access.free_sessions_limit ?? 1))
  const left = Math.max(0, Number(access.free_sessions_left ?? 0))
  const label = `무료 ${left}/${limit}`
  return { label, variant: left > 0 ? "secondary" : "destructive" }
}
// buildAccessBadge: 이용권 상태에 맞춰 표시할 배지 텍스트와 색상을 계산한다.

const toDbType = (t: SessionType) => (t === "standard" ? "mix" : t === "weakness" ? "weak_focus" : t)

export function StartLearningCard({
  disabledWeakSession,
  preferResumeLabel,
  difficultyNotice,
  accessSummary = null,
  totalSentenceCount = 0,
}: {
  disabledWeakSession?: boolean
  preferResumeLabel?: boolean
  difficultyNotice?: { applied: boolean; reason: string }
  accessSummary?: AccessSummary | null
  totalSentenceCount?: number
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [guardMessage, setGuardMessage] = useState<string | null>(null)
  const [activeSid, setActiveSid] = useState<string | null>(null)

  const accessBadge = useMemo(() => buildAccessBadge(accessSummary), [accessSummary])
  const showExpiredNotice = accessSummary?.status === "expired"
  const showQuotaNotice =
    !showExpiredNotice && accessSummary && accessSummary.status !== "pro" && accessSummary.free_sessions_left === 0
  const blockedForPayment = showExpiredNotice || showQuotaNotice
  const primaryButtonLabel = blockedForPayment
    ? "이용권 구매하기"
    : loading
    ? "준비 중..."
    : activeSid && preferResumeLabel
    ? "이어서 학습"
    : "학습 시작"

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const res = await fetch("/api/sessions?active=1", { cache: "no-store" })
        if (!res.ok) return
        const json = await res.json()
        const sid = json?.session_id ?? null
        if (mounted) setActiveSid(typeof sid === "string" && sid.length > 0 ? sid : null)
      } catch {
        /* ignore */
      }
    })()
    return () => {
      mounted = false
    }
  }, [])

  const handleStart = async (type: SessionType) => {
    try {
      setLoading(true)
      if (activeSid) {
        router.push(`/learn?sid=${encodeURIComponent(activeSid)}`)
        return
      }

      const guardRes = await fetch("/api/learn/check", { method: "POST" })
      const guardJson: LearnCheckResponse = await guardRes
        .json()
        .catch(() => ({ can_start: false, reason: "UNKNOWN" }))
      if (!guardRes.ok || guardJson?.reason === "UNKNOWN") {
        throw new Error(`학습 가능 여부 확인 실패 (status ${guardRes.status})`)
      }

      if (!guardJson.can_start) {
        if (guardJson.reason === "NO_FREE_LEFT") {
          setGuardMessage("무료 학습 횟수를 모두 사용했습니다. 설정 페이지에서 이용권을 구매해 주세요.")
          router.push("/settings?from=dashboard")
        } else {
          setGuardMessage("현재 학습을 시작할 수 없습니다. 잠시 후 다시 시도해 주세요.")
        }
        setOpen(false)
        return
      }

      setGuardMessage(null)

      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: toDbType(type) }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      router.push(`/learn?sid=${encodeURIComponent(json.session_id)}`)
    } catch (error) {
      console.error(error)
      alert("세션 생성에 실패했습니다. 잠시 후 다시 시도해 주세요.")
    } finally {
      setLoading(false)
      setOpen(false)
    }
  }

  return (
    <Card className="border-primary/20 bg-primary/5 space-y-4">
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2">
            <Play className="h-5 w-5" />
            학습 시작
          </CardTitle>
          {accessBadge ? (
            <Badge variant={accessBadge.variant} className="whitespace-nowrap font-medium">
              {accessBadge.label}
            </Badge>
          ) : null}
        </div>
        <CardDescription>
          학습을 위한 기본 조건이 모두 준비되었습니다.
          {disabledWeakSession ? " (취약 세션은 아직 비활성 상태입니다)" : ""}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {showExpiredNotice ? (
          <Alert variant="destructive">
            <AlertDescription>이용권이 만료되었습니다. 설정 화면에서 이용권을 다시 활성화해 주세요.</AlertDescription>
          </Alert>
        ) : null}
        {!showExpiredNotice && showQuotaNotice ? (
          <Alert variant="destructive">
            <AlertDescription>오늘 무료 학습 횟수를 모두 사용했습니다. 이용권을 구매하면 바로 학습을 이어갈 수 있어요.</AlertDescription>
          </Alert>
        ) : null}
        {guardMessage && (
          <Alert variant="destructive">
            <AlertDescription>{guardMessage}</AlertDescription>
          </Alert>
        )}

        {difficultyNotice && (
          <Alert variant={difficultyNotice.applied ? "destructive" : "default"}>
            <AlertDescription>
              {difficultyNotice.applied
                ? `난이도 조정 적용: ${difficultyNotice.reason || "최근 학습 결과에 따라 난이도가 조정되었습니다."}`
                : `난이도 유지: ${difficultyNotice.reason || "기본 난이도로 진행합니다."}`}
            </AlertDescription>
          </Alert>
        )}

        <Button
          className="w-full"
          onClick={() => {
            if (blockedForPayment) {
              router.push("/settings?from=dashboard")
              return
            }
            if (activeSid && preferResumeLabel) {
              router.push(`/learn?sid=${encodeURIComponent(activeSid)}`)
            } else {
              setOpen(true)
            }
          }}
          disabled={!blockedForPayment && loading}
        >
          {primaryButtonLabel}
        </Button>
      </CardContent>

      {!blockedForPayment ? (
        <SessionTypeModal
          open={open}
          onOpenChange={setOpen}
          onStartSession={handleStart}
          preselectedType="new_only"
          difficultyNotice={difficultyNotice}
          totalSentenceCount={totalSentenceCount}
        />
      ) : null}
    </Card>
  )
}
// StartLearningCard: 대시보드에서 학습 시작 버튼과 이용권 안내를 제공한다.
// 사용처: app/dashboard/page.tsx의 학습 카드 구성에 사용된다.
