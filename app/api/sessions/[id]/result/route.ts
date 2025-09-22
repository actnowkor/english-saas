// 경로: app/api/sessions/[id]/result/route.ts
// 역할: 세션 번들 요약을 활용해 최종 결과를 반환하는 API
// 의존관계: lib/supabase/server-client.ts, supabase RPC get_bundle_result
// 포함 함수: GET()

import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server-client"

type BundleSummary = {
  summary?: {
    metadata?: {
      session_id?: string
      user_id?: string
      strategy?: any
      started_at?: string
      ended_at?: string
    }
    items?: Array<{
      item_id?: string
      order_index?: number
      type?: string | null
      level?: string | null
      concept_key?: string | null
      concept_ko?: string | null
      snapshot?: any
    }>
    attempts?: Array<{
      item_id?: string
      order_index?: number
      attempt_id?: string
      answer?: string
      label?: string
      feedback?: string
      minimal_rewrite?: string
      submitted_at?: string
      latency_ms?: number
    }>
    metrics?: {
      total_items?: number
      correct_items?: number
      sentence_count?: number
      word_count?: number
      phrase_count?: number
      duration_ms?: number
    }
    calendar?: { dates?: string[] }
  }
  started_at?: string
  ended_at?: string
}

export async function GET(
  _req: Request,
  context: { params: { id: string } } | { params: Promise<{ id: string }> }
) {
  const params = await Promise.resolve((context as any).params)
  const sessionId = params.id

  const supabase = await createClient()
  try {
    const { data: auth } = await supabase.auth.getUser()
    const user = auth?.user
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: sessionRow, error: sessionError } = await supabase
      .from("sessions")
      .select("id, user_id, bundle_id")
      .eq("id", sessionId)
      .single()
    if (sessionError || !sessionRow) {
      return NextResponse.json({ error: "세션을 찾을 수 없습니다." }, { status: 404 })
    }
    if (sessionRow.user_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    if (!sessionRow.bundle_id) {
      return NextResponse.json({ error: "결과가 아직 준비되지 않았습니다." }, { status: 409 })
    }

    const { data, error } = await supabase.rpc("get_bundle_result", { p_bundle_id: sessionRow.bundle_id })
    if (error) {
      console.error("[RPC get_bundle_result] error:", error)
      return NextResponse.json({ error: "결과 조회에 실패했습니다." }, { status: 500 })
    }

    const bundle: BundleSummary = data ?? {}
    const summary = bundle.summary ?? {}
    const metadata = summary.metadata ?? {}
    const metrics = summary.metrics ?? {}
    const attempts = Array.isArray(summary.attempts) ? summary.attempts : []
    const itemsFromSummary = Array.isArray(summary.items) ? summary.items : []

    const attemptMap = new Map<string, (typeof attempts)[number]>()
    for (const att of attempts) {
      if (att?.item_id) attemptMap.set(String(att.item_id), att)
    }

    const items = itemsFromSummary.map((item) => {
      const snap = item?.snapshot ?? {}
      const attempt = attemptMap.get(String(item?.item_id ?? ""))
      return {
        order_index: Number(item?.order_index ?? 0),
        item_id: String(item?.item_id ?? ""),
        type: item?.type ?? null,
        level: item?.level ?? null,
        concept_key: item?.concept_key ?? null,
        concept_ko: item?.concept_ko ?? null,
        question: snap?.source_ko ?? "",
        correct_answer: snap?.answer_en ?? "",
        attempt_id: attempt?.attempt_id ?? null,
        submitted_at: attempt?.submitted_at ?? null,
        latency_ms: attempt?.latency_ms ?? null,
        user_answer: attempt?.answer ?? null,
        label: attempt?.label ?? null,
        feedback: attempt?.feedback ?? null,
        minimal_rewrite: attempt?.minimal_rewrite ?? null,
      }
    })

    items.sort((a, b) => a.order_index - b.order_index)

    return NextResponse.json({
      session_id: metadata.session_id ?? sessionId,
      bundle_id: sessionRow.bundle_id,
      started_at: metadata.started_at ?? bundle.started_at ?? null,
      ended_at: metadata.ended_at ?? bundle.ended_at ?? null,
      total: Number(metrics.total_items ?? items.length ?? 0),
      correct: Number(metrics.correct_items ?? 0),
      metrics,
      calendar: summary.calendar ?? { dates: [] },
      items,
    })
  } catch (e: any) {
    console.error("[GET /api/sessions/:id/result] error:", e?.message || e)
    return NextResponse.json({ error: e?.message ?? "서버 오류" }, { status: 500 })
  }
}
// GET: 번들 요약을 기반으로 세션 결과를 반환한다.

// 용도: 결과 페이지와 히스토리 상세에서 호출한다.
