// ê²½ë¡œ: app/api/payments/start/route.ts
// ??• : PayApp ê²°ì œë¥??œì‘?˜ê³  ê²°ì œ URL??ë°˜í™˜
// ?˜ì¡´ê´€ê³? lib/supabase/server-client.ts, lib/supabase/service-client.ts, lib/payments/payapp-client.ts
// ?¬í•¨ ?¨ìˆ˜: POST()

import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server-client"
import { createServiceClient } from "@/lib/supabase/service-client"
import { getPayAppConfig, requestPayApp } from "@/lib/payments/payapp-client"

function sanitizePhone(raw: string) {
  const digits = raw.replace(/\D+/g, "")
  if (digits.length < 9 || digits.length > 11) {
    throw new Error("?´ë???ë²ˆí˜¸ ?•ì‹???¬ë°”ë¥´ì? ?ŠìŠµ?ˆë‹¤.")
  }
  return digits
}

export async function POST(req: Request) {
  const supabase = await createClient()
  const service = createServiceClient()
  const { data: auth } = await supabase.auth.getUser()

  if (!auth?.user) {
    return NextResponse.json({ error: "Unauthorized: ë¡œê·¸???„ìš”" }, { status: 401 })
  }

  let body: any = {}
  try {
    body = await req.json()
  } catch {}

  const productId = String(body?.product_id || "").trim()
  const phoneRaw = String(body?.phone || "").trim()

  if (!productId) {
    return NextResponse.json({ error: "product_id???„ìˆ˜?…ë‹ˆ??" }, { status: 400 })
  }
  if (!phoneRaw) {
    return NextResponse.json({ error: "phone?€ ?„ìˆ˜?…ë‹ˆ??" }, { status: 400 })
  }

  try {
    const phone = sanitizePhone(phoneRaw)

    const { data: product, error: productError } = await service
      .from("products")
      .select("id, display_name, launch_price_krw, list_price_krw, is_active")
      .eq("id", productId)
      .maybeSingle()

    if (productError) throw productError
    if (!product || !product.is_active) {
      return NextResponse.json({ error: "?í’ˆ???´ìš©?????†ìŠµ?ˆë‹¤." }, { status: 404 })
    }

    const amount = Number(product.launch_price_krw ?? product.list_price_krw)
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new Error("? íš¨?˜ì? ?Šì? ?í’ˆ ê¸ˆì•¡?…ë‹ˆ??")
    }

    const { data: payment, error: insertError } = await service
      .from("payments")
      .insert({
        user_id: auth.user.id,
        product_id: product.id,
        provider: "payapp",
        amount_krw: amount,
        status: "pending",
      })
      .select("id, meta_json")
      .single()

    if (insertError) throw insertError

    const payAppConfig = getPayAppConfig()
    const requestParams: Record<string, string> = {
      cmd: "payrequest",
      goodname: product.display_name,
      price: String(amount),
      recvphone: phone,
      feedbackurl: payAppConfig.feedbackUrl,
      var1: payment.id,
      checkretry: "y",
    }
    if (payAppConfig.returnUrl) {
      requestParams.returnurl = payAppConfig.returnUrl
    }

    const payappResponse = await requestPayApp(requestParams)
    const stateValue = Number(payappResponse.state)

    const auditMeta = {
      ...(payment.meta_json ?? {}),
      payrequest: {
        request: {
          cmd: requestParams.cmd,
          goodname: requestParams.goodname,
          price: requestParams.price,
          recvphone: phone,
        },
        response: payappResponse,
      },
    }

    if (stateValue === 1 && typeof payappResponse.payurl === "string" && typeof payappResponse.mul_no === "string") {
      const { error: updateError } = await service
        .from("payments")
        .update({
          provider_tx_id: payappResponse.mul_no,
          meta_json: auditMeta,
        })
        .eq("id", payment.id)

      if (updateError) throw updateError

      return NextResponse.json({
        payment_id: payment.id,
        payurl: payappResponse.payurl,
      })
    }

    await service
      .from("payments")
      .update({
        status: "failed",
        meta_json: auditMeta,
      })
      .eq("id", payment.id)

    const message = typeof payappResponse.message === "string" ? payappResponse.message : "ê²°ì œ ?”ì²­???¤íŒ¨?ˆìŠµ?ˆë‹¤."
    return NextResponse.json({ error: message }, { status: 400 })
  } catch (err: any) {
    console.error("[POST /api/payments/start] error", err?.message || err)
    return NextResponse.json({ error: err?.message ?? "?œë²„ ?¤ë¥˜" }, { status: 500 })
  }
}
