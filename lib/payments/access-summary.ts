// 경로: lib/payments/access-summary.ts
// 역할: 결제/권리 요약 정보를 조회하고 일일 무료 횟수 상태를 계산
// 의존관계: lib/supabase/service-client.ts, @supabase/supabase-js, public.can_start_session 함수
// 포함 함수: loadAccessSummary()

import type { SupabaseClient } from "@supabase/supabase-js"
import type { SupabaseServiceClient } from "@/lib/supabase/service-client"

const DAILY_FREE_LIMIT = 1
const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000

type GuardPayload = {
  can_start: boolean
  reason: string
  free_sessions_used_today: number
  pro_until: string | null
} | null

export type AccessSummary = {
  status: "free" | "pro" | "expired"
  pro_until: string | null
  can_cancel: boolean
  cancel_deadline: string | null
  payment_id: string | null
  free_sessions_used_today: number
  free_sessions_left: number
  free_sessions_limit: number
  can_start: boolean
  reason: string
}

export async function loadAccessSummary(
  service: SupabaseServiceClient | SupabaseClient,
  userId: string
): Promise<AccessSummary> {
  const { data: entitlement, error } = await service
    .from("entitlements")
    .select(
      `id, user_id, start_at, end_at, is_active, payment_id,
       payments:payments(id, status, paid_at)`
    )
    .eq("user_id", userId)
    .order("start_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw error

  let status: "free" | "pro" | "expired" = "free"
  let proUntil: string | null = null
  let canCancel = false
  let cancelDeadline: string | null = null
  let paymentId: string | null = null

  if (entitlement) {
    const now = Date.now()
    const startAt = new Date(entitlement.start_at)
    const endAt = new Date(entitlement.end_at)
    const withinWindow = startAt.getTime() <= now && endAt.getTime() > now

    proUntil = entitlement.end_at
    paymentId = entitlement.payment_id
    status = "expired"

    if (entitlement.is_active && withinWindow) {
      status = "pro"
    }

    const payment = entitlement.payments
    if (status === "pro" && payment?.status === "paid" && payment?.paid_at) {
      const paidAt = new Date(payment.paid_at)
      const diff = Date.now() - paidAt.getTime()
      if (diff <= THREE_DAYS_MS) {
        canCancel = true
        cancelDeadline = new Date(paidAt.getTime() + THREE_DAYS_MS).toISOString()
      }
    }
  }

  let guard: GuardPayload = null
  try {
    const { data: guardData } = await (service as SupabaseClient)
      .rpc("can_start_session", { p_user_id: userId })
    guard = guardData as GuardPayload
  } catch (rpcError) {
    console.warn("[loadAccessSummary] can_start_session 호출 실패", (rpcError as any)?.message ?? rpcError)
  }

  const usedToday = Math.max(0, Number(guard?.free_sessions_used_today ?? 0))
  const freeLeft = Math.max(0, DAILY_FREE_LIMIT - usedToday)

  const summary: AccessSummary = {
    status,
    pro_until: proUntil || guard?.pro_until || null,
    can_cancel: canCancel,
    cancel_deadline: cancelDeadline,
    payment_id: paymentId,
    free_sessions_used_today: usedToday,
    free_sessions_left: status === "pro" ? DAILY_FREE_LIMIT : freeLeft,
    free_sessions_limit: DAILY_FREE_LIMIT,
    can_start: Boolean(guard?.can_start),
    reason: guard?.reason || "UNKNOWN",
  }

  return summary
}
// loadAccessSummary: 특정 사용자의 결제/권리 요약과 무료 이용 가능 횟수를 계산한다.
// 사용처: /api/entitlements/me, /api/dashboard 등에서 호출한다.
