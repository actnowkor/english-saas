// 경로: app/api/payments/webhook/route.ts
// 역할: PayApp 웹훅을 수신하여 결제 상태를 멱등 처리하고 이용권을 발급
// 의존관계: lib/supabase/service-client.ts, lib/payments/payapp-client.ts
// 포함 함수: POST()

import { createServiceClient } from "@/lib/supabase/service-client"
import { verifyLinkval } from "@/lib/payments/payapp-client"

function parseBody(text: string) {
  const params = new URLSearchParams(text)
  const entries = Array.from(params.entries())
  if (entries.length === 0) {
    try {
      return JSON.parse(text)
    } catch {
      return {}
    }
  }
  return Object.fromEntries(entries)
}

function parsePayDate(value: unknown) {
  if (typeof value !== "string" || value.length !== 14) {
    return new Date()
  }
  const year = Number(value.slice(0, 4))
  const month = Number(value.slice(4, 6)) - 1
  const day = Number(value.slice(6, 8))
  const hour = Number(value.slice(8, 10))
  const minute = Number(value.slice(10, 12))
  const second = Number(value.slice(12, 14))
  const date = new Date(year, month, day, hour, minute, second)
  if (Number.isNaN(date.getTime())) {
    return new Date()
  }
  return date
}

function addDays(base: Date, days: number) {
  const d = new Date(base)
  d.setDate(d.getDate() + days)
  return d
}

export async function POST(req: Request) {
  const service = createServiceClient()
  const raw = await req.text()
  const payload = parseBody(raw)

  if (!verifyLinkval(payload)) {
    console.warn("[POST /api/payments/webhook] invalid linkval", payload)
    return new Response("FAIL", { status: 400 })
  }

  const paymentId = payload.var1 as string | undefined
  if (!paymentId) {
    console.warn("[POST /api/payments/webhook] missing payment id", payload)
    return new Response("FAIL", { status: 400 })
  }

  try {
    const { data: payment, error: paymentError } = await service
      .from("payments")
      .select("id, user_id, product_id, amount_krw, status, provider_tx_id, meta_json")
      .eq("id", paymentId)
      .maybeSingle()

    if (paymentError) throw paymentError

    if (!payment) {
      console.warn("[POST /api/payments/webhook] payment not found", paymentId)
      return new Response("FAIL", { status: 404 })
    }

    const { error: eventError } = await service
      .from("payment_events")
      .insert({
        payment_id: payment.id,
        event_type: "webhook.received",
        payload_json: payload,
      })
    if (eventError) throw eventError

    const mulNo = payload.mul_no as string | undefined
    const payState = String(payload.pay_state ?? "")
    const price = Number(payload.price ?? payload.amount ?? payload.total ?? 0)

    if (price && price !== payment.amount_krw) {
      console.warn("[POST /api/payments/webhook] amount mismatch", price, payment.amount_krw)
      return new Response("FAIL", { status: 400 })
    }

    if (payment.provider_tx_id && mulNo && payment.provider_tx_id !== mulNo) {
      console.warn("[POST /api/payments/webhook] provider tx mismatch", mulNo, payment.provider_tx_id)
      return new Response("FAIL", { status: 400 })
    }

    const meta = {
      ...(payment.meta_json ?? {}),
      lastWebhook: payload,
    }

    const updates: Record<string, any> = {
      meta_json: meta,
    }

    if (mulNo && !payment.provider_tx_id) {
      updates.provider_tx_id = mulNo
    }

    if (payState === "4") {
      if (payment.status !== "paid") {
        const startAt = parsePayDate(payload.pay_date)
        const endAt = addDays(startAt, 30)
        updates.status = "paid"
        updates.paid_at = new Date().toISOString()

        const { error: entitlementError } = await service
          .from("entitlements")
          .upsert(
            [
              {
                user_id: payment.user_id,
                product_id: payment.product_id,
                payment_id: payment.id,
                start_at: startAt.toISOString(),
                end_at: endAt.toISOString(),
              },
            ],
            { onConflict: "payment_id" }
          )

        if (entitlementError) throw entitlementError

        const { error: statusEventError } = await service
          .from("payment_events")
          .insert({
            payment_id: payment.id,
            event_type: "status.paid",
            payload_json: payload,
          })
        if (statusEventError) throw statusEventError
      }
    } else if (payState === "5" || payState === "8") {
      if (payment.status !== "canceled") {
        updates.status = "canceled"
        updates.canceled_at = new Date().toISOString()

        const { error: statusEventError } = await service
          .from("payment_events")
          .insert({
            payment_id: payment.id,
            event_type: "status.canceled",
            payload_json: payload,
          })
        if (statusEventError) throw statusEventError
      }
    }

    if (Object.keys(updates).length > 0) {
      const { error: updateError } = await service
        .from("payments")
        .update(updates)
        .eq("id", payment.id)
      if (updateError) throw updateError
    }

    return new Response("SUCCESS", { status: 200 })
  } catch (err: any) {
    console.error("[POST /api/payments/webhook] error", err?.message || err)
    return new Response("FAIL", { status: 500 })
  }
}