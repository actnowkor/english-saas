// 경로: app/api/payments/cancel/route.ts
// 역할: 결제 3일 이내 취소 요청을 처리하고 이용권을 종료
// 의존관계: lib/supabase/server-client.ts, lib/supabase/service-client.ts, lib/payments/payapp-client.ts
// 포함 함수: POST()

import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server-client"
import { createServiceClient } from "@/lib/supabase/service-client"
import { requestPayApp } from "@/lib/payments/payapp-client"

const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000

export async function POST(req: Request) {
  const supabase = await createClient()
  const service = createServiceClient()
  const { data: auth } = await supabase.auth.getUser()

  if (!auth?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let body: any = {}
  try {
    body = await req.json()
  } catch {}

  const paymentId = String(body?.payment_id || "").trim()
  const reason = String(body?.reason || "사용자 취소").trim() || "사용자 취소"

  if (!paymentId) {
    return NextResponse.json({ error: "payment_id는 필수입니다." }, { status: 400 })
  }

  try {
    const { data: payment, error } = await service
      .from("payments")
      .select("id, user_id, provider_tx_id, status, paid_at, amount_krw")
      .eq("id", paymentId)
      .maybeSingle()

    if (error) throw error
    if (!payment || payment.user_id !== auth.user.id) {
      return NextResponse.json({ error: "결제를 찾을 수 없습니다." }, { status: 404 })
    }
    if (payment.status !== "paid" || !payment.paid_at) {
      return NextResponse.json({ error: "취소 가능한 결제가 아닙니다." }, { status: 400 })
    }
    if (!payment.provider_tx_id) {
      return NextResponse.json({ error: "결제 정보가 올바르지 않습니다." }, { status: 400 })
    }

    const paidAt = new Date(payment.paid_at)
    if (Date.now() - paidAt.getTime() > THREE_DAYS_MS) {
      return NextResponse.json({ error: "결제 후 3일이 지나 취소할 수 없습니다." }, { status: 400 })
    }

    const payappResponse = await requestPayApp({
      cmd: "paycancel",
      mul_no: payment.provider_tx_id,
      cancelmemo: reason,
    })

    if (Number(payappResponse.state) !== 1) {
      const message = typeof payappResponse.message === "string" ? payappResponse.message : "취소 요청에 실패했습니다."
      return NextResponse.json({ error: message }, { status: 400 })
    }

    const { error: updatePaymentError } = await service
      .from("payments")
      .update({ status: "canceled", canceled_at: new Date().toISOString() })
      .eq("id", payment.id)
    if (updatePaymentError) throw updatePaymentError

    const { error: eventError } = await service
      .from("payment_events")
      .insert({
        payment_id: payment.id,
        event_type: "status.canceled_user",
        payload_json: payappResponse,
      })
    if (eventError) throw eventError

    const { error: entitlementError } = await service
      .from("entitlements")
      .update({ end_at: new Date().toISOString(), is_active: false })
      .eq("payment_id", payment.id)
    if (entitlementError) throw entitlementError

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error("[POST /api/payments/cancel]", err?.message || err)
    return NextResponse.json({ error: err?.message ?? "server error" }, { status: 500 })
  }
}