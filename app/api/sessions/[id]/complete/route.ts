// 경로: app/api/sessions/[id]/complete/route.ts
// 역할: 학습 세션 종료 처리 후 번들 생성 및 레벨 자동 평가
// 의존관계: lib/supabase/server-client.ts, lib/logic/level-utils.ts
// 포함 함수: POST()

import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server-client"
import { autoLevelUp } from "@/lib/logic/level-utils"

export async function POST(
  _req: Request,
  context: { params: { id: string } } | { params: Promise<{ id: string }> }
) {
  const params = await Promise.resolve((context as any).params)
  const sessionId = params.id
  const supabase = await createClient()

  try {
    const { data: auth } = await supabase.auth.getUser()
    if (!auth?.user) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 })
    }

    const { data: sessionRow, error: sessionError } = await supabase
      .from("sessions")
      .select("id, user_id")
      .eq("id", sessionId)
      .single()
    if (sessionError || !sessionRow) {
      return NextResponse.json({ error: "세션을 찾을 수 없습니다." }, { status: 404 })
    }
    if (sessionRow.user_id !== auth.user.id) {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 })
    }

    const { error: srsError } = await supabase.rpc("update_srs", { p_session_id: sessionId })
    if (srsError) {
      console.error("update_srs error", srsError)
      return NextResponse.json({ error: "SRS 갱신에 실패했습니다." }, { status: 500 })
    }

    const { error: completeError } = await supabase.rpc("complete_session", { p_session_id: sessionId })
    if (completeError) {
      console.error("complete_session error", completeError)
      return NextResponse.json({ error: "세션 종료에 실패했습니다." }, { status: 500 })
    }

    const { data: bundleResult, error: bundleError } = await supabase.rpc("archive_session_into_bundle", {
      p_session_id: sessionId,
    })
    if (bundleError) {
      console.error("archive_session_into_bundle error", bundleError)
      return NextResponse.json({ error: "세션 번들 저장에 실패했습니다." }, { status: 500 })
    }

    const bundleId = typeof bundleResult === "string" ? bundleResult : String(bundleResult ?? "") || null

    try {
      await supabase
        .from("sessions")
        .update({ ended_at: new Date().toISOString(), status: "completed" })
        .eq("id", sessionId)
        .eq("user_id", auth.user.id)
    } catch (updateError) {
      console.warn("session final update failed", updateError)
    }

    let levelResult = null
    try {
      levelResult = await autoLevelUp(supabase, auth.user.id, "session_complete")
    } catch (evalError) {
      console.warn("autoLevelUp error", evalError)
      levelResult = { leveled_up: false, reason: "evaluation_failed" }
    }

    return NextResponse.json({ ok: true, level: levelResult, bundle_id: bundleId })
  } catch (err: any) {
    console.error("[POST /api/sessions/:id/complete] error", err?.message || err)
    return NextResponse.json({ error: err?.message ?? "서버 오류" }, { status: 500 })
  }
}
// POST: SRS 갱신과 세션 종료 후 번들을 생성하고 자동 레벨 평가 결과를 반환한다.

// 용도: 학습 세션이 종료될 때 호출한다.
