// 경로: components/dashboard/start-learning-card.tsx
// 역할: 학습 대시보드에서 학습 시작 버튼과 이용권/무료 이용 상태를 안내한다.
// 의존관계: components/dashboard/session-type-modal.tsx, app/api/learn/check, app/api/sessions
// 포함 함수: formatBadgeDate(), buildAccessBadge(), toDbType(), StartLearningCard()

"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Play } from "lucide-react"
import { SessionTypeModal } from "@/components/dashboard/session-type-modal"
import type { LevelStats } from "@/lib/logic/level-utils"
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
// formatBadgeDate: 배지에 표시할 날짜를 YYYY.MM.DD 형식으로 변환한다.

function buildAccessBadge(access?: AccessSummary | null): AccessBadge | null {
  if (!access) return null
  // 관리자: 무제한 배지(한글)
  if (access.reason === "OK_ADMIN") {
    return { label: "관리자", variant: "default" }
  }

  if (access.status === "pro") {
    const until = formatBadgeDate(access.pro_until)
    return { label: `프리미엄 이용권 ~${until}`, variant: "default" }
  }
  // ✅ 서버가 준 값을 최우선으로 사용 (백엔드가 이미 10/10 로직을 보장)
  const limit = Math.max(1, Number(access.free_sessions_limit ?? 10))

  // 1) 서버 left가 오면 그대로 신뢰
  const serverLeft = Number.isFinite(Number(access.free_sessions_left))
    ? Math.max(0, Math.min(limit, Number(access.free_sessions_left)))
    : null

  // 2) 없으면 used_today로 최소한 보정 (limit - used)
  const usedToday = Math.max(0, Number(access.free_sessions_used_today ?? 0))
  const fallbackLeft = Math.max(0, Math.min(limit, limit - usedToday))

  const left = serverLeft !== null ? serverLeft : fallbackLeft

  const label = `무료 ${left}/${limit}`
  return { label, variant: left > 0 ? "secondary" : "destructive" }

}
// buildAccessBadge: 이용 상태에 맞는 배지 문구와 색상을 계산한다.

const toDbType = (t: SessionType) => (t === "standard" ? "mix" : t === "weakness" ? "weak_focus" : t)
// toDbType: 프론트 세션 타입을 DB에서 기대하는 값으로 치환한다.

export function StartLearningCard({
  disabledWeakSession,
  preferResumeLabel,
  levelStats,
  currentLevel,
  accessSummary = null,
  totalSentenceCount = 0,
}: {
  disabledWeakSession?: boolean
  preferResumeLabel?: boolean
  levelStats?: LevelStats | null
  currentLevel?: number | null
  accessSummary?: AccessSummary | null
  totalSentenceCount?: number
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [guardMessage, setGuardMessage] = useState<string | null>(null)
  const [activeSid, setActiveSid] = useState<string | null>(null)

  const accessBadge = useMemo(() => buildAccessBadge(accessSummary), [accessSummary])
  const isAdmin = accessSummary?.reason === "OK_ADMIN"
  const freeSessionsLeft = isAdmin ? Number.POSITIVE_INFINITY : Math.max(0, Number(accessSummary?.free_sessions_left ?? 0))
  const showExpiredNotice = !isAdmin && accessSummary?.status === "expired"
  const expiredBlocksStart = showExpiredNotice && freeSessionsLeft <= 0
  const showQuotaNotice =
    !showExpiredNotice && !isAdmin && accessSummary && accessSummary.status !== "pro" && freeSessionsLeft === 0
  const blockedForPayment = isAdmin ? false : expiredBlocksStart || showQuotaNotice
  const primaryButtonLabel = blockedForPayment
    ? "이용권 알아보기"
    : loading
    ? "준비 중..."
    : activeSid && preferResumeLabel
    ? "이어서 학습"
    : "학습 시작"

  const recentRate =
    typeof levelStats?.recent_correct_rate === "number"
      ? Math.round(levelStats.recent_correct_rate * 100)
      : null
  const stableRatio =
    typeof levelStats?.stable_concept_ratio === "number"
      ? Math.round(levelStats.stable_concept_ratio * 100)
      : null
  const stableCount =
    typeof levelStats?.stable_concept_count === "number"
      ? levelStats.stable_concept_count
      : null
  const lowBox =
    typeof levelStats?.low_box_concept_count === "number"
      ? levelStats.low_box_concept_count
      : null
  const totalAttempts =
    typeof levelStats?.total_attempts === "number" ? levelStats.total_attempts : null

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

      // ✅ 관리자 계정은 가드체크(/api/learn/check) 생략하고 바로 세션 생성
      if (isAdmin) {
        setGuardMessage(null)
        const res = await fetch("/api/sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: toDbType(type) }),
        })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const json = await res.json()
        router.push(`/learn?sid=${encodeURIComponent(json.session_id)}`)
        return
      }


      const guardRes = await fetch("/api/learn/check", { method: "POST" })
      const guardJson: LearnCheckResponse = await guardRes
        .json()
        .catch(() => ({ can_start: false, reason: "UNKNOWN" }))
      if (!guardRes.ok || guardJson?.reason === "UNKNOWN") {
        throw new Error(`학습 시작 조건 확인 실패 (status ${guardRes.status})`)
      }

      if (!guardJson.can_start) {
        if (guardJson.reason === "NO_FREE_LEFT") {
          setGuardMessage("오늘의 무료 학습 기회를 모두 사용했습니다. 이용권을 활성화하면 바로 학습할 수 있어요.")
          router.push("/settings?from=dashboard")
        } else {
          setGuardMessage("현재는 학습을 시작할 수 없습니다. 잠시 후 다시 시도해 주세요.")
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
      alert("학습을 시작하는 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.")
    } finally {
      setLoading(false)
      setOpen(false)
    }
  }
  // handleStart: 학습 시작 요청을 전송하고 결과에 따라 이동한다.

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
          {disabledWeakSession ? " (약점 집중 세션은 현재 비활성화됨)" : ""}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isAdmin ? (
          <Alert>
            <AlertDescription>관리자 계정입니다. 무제한 학습이 활성화되어 있어요.</AlertDescription>
          </Alert>
        ) : null}
        {showExpiredNotice ? (
          <Alert variant={expiredBlocksStart ? "destructive" : "default"}>
            <AlertDescription>
              {expiredBlocksStart
                ? "이용권이 만료되었습니다. 설정 화면에서 이용권을 다시 활성화해 주세요."
                : "이용권은 만료되었지만 하루 1회 무료 학습은 계속 이용할 수 있습니다."}
            </AlertDescription>
          </Alert>
        ) : null}
        {!showExpiredNotice && showQuotaNotice ? (
          <Alert variant="destructive">
            <AlertDescription>오늘의 무료 학습 기회를 모두 사용했습니다. 이용권을 결제하면 즉시 학습을 계속할 수 있어요.</AlertDescription>
          </Alert>
        ) : null}
        {guardMessage && (
          <Alert variant="destructive">
            <AlertDescription>{guardMessage}</AlertDescription>
          </Alert>
        )}

        {levelStats ? (
          <Alert>
            <AlertDescription>
              최근 학습 지표를 확인했어요. 현재 레벨 {typeof currentLevel === "number" ? `L${currentLevel}` : "-"} 기준
              다음 수치를 참고하세요.
              <span className="mt-1 block text-xs text-muted-foreground space-y-0.5">
                <span className="block">최근 정답률 {recentRate != null ? `${recentRate}%` : "-"}</span>
                <span className="block">
                  안정화 개념 {stableCount != null ? stableCount.toLocaleString() : "-"}
                  {stableRatio != null ? ` (${stableRatio}% 비중)` : ""}
                </span>
                <span className="block">낮은 박스 개념 {lowBox != null ? lowBox.toLocaleString() : "-"}</span>
                <span className="block">누적 시도 {totalAttempts != null ? totalAttempts.toLocaleString() : "-"}</span>
              </span>
            </AlertDescription>
          </Alert>
        ) : (
          <Alert>
            <AlertDescription>아직 충분한 학습 데이터가 없어 기본 난이도로 시작합니다.</AlertDescription>
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
          levelStats={levelStats}
          currentLevel={currentLevel}
          totalSentenceCount={totalSentenceCount}
        />
      ) : null}
    </Card>
  )
}
// StartLearningCard: 학습 시작 카드 UI를 렌더링한다.
// 사용 예: <StartLearningCard accessSummary={summary} />
