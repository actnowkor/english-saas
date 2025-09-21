// 경로: app/api/test/grade/route.ts
// 역할: 테스트용 채점 API
// 동작 순서:
//  1) 세션 아이템 로드 → 정답/허용변형 기준 간이 채점
//  2) submit_attempt() RPC 호출 → attempts 기록
//  3) save_grade() RPC 호출 → grades 기록
//  4) update_srs() RPC 호출 → 라이트너(user_item_status / user_concept_status) 갱신
//  5) complete_session() RPC 호출 → 세션 종료 (status='completed')
//  6) 채점 결과 JSON 반환

import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server-client"

// 간단한 정규화 함수
function normalize(s: string) {
  return s
    .toLowerCase()
    .replace(/[.,!?]/g, "")
    .replace(/\s+/g, " ")
    .trim()
}

export async function POST(req: Request) {
  try {
    const { session_id, answers } = await req.json()
    if (!session_id || !Array.isArray(answers)) {
      return NextResponse.json({ error: "Bad request" }, { status: 400 })
    }

    const supabase = await createClient()
    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser()
    if (userErr || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // 1) 세션 아이템 로드
    const { data: rows, error: loadErr } = await supabase
      .from("session_items")
      .select("item_id, snapshot_json")
      .eq("session_id", session_id)

    if (loadErr || !rows) {
      console.error(loadErr)
      return NextResponse.json({ error: "Failed to load session items" }, { status: 500 })
    }

    const results: any[] = []

    // 2) 답안 채점 & DB 기록
    for (const a of answers as Array<{ item_id: string; user_answer: string }>) {
      const row = rows.find((r) => r.item_id === a.item_id)
      const snap = row?.snapshot_json || {}
      const expected: string = snap.answer_en || ""
      const allowed: string[] = (snap.allowed_variants_text || "")
        .split(/[|,]/)
        .map((s: string) => s.trim())
        .filter(Boolean)

      const nUser = normalize(a.user_answer || "")
      const nExpected = normalize(expected)
      const nAllowed = allowed.map(normalize)

      const correct = nUser.length > 0 && (nUser === nExpected || nAllowed.includes(nUser))

      // 2-1) attempts 기록
      const { data: attemptId, error: attemptErr } = await supabase.rpc("submit_attempt", {
        p_session_id: session_id,
        p_item_id: a.item_id,
        p_answer_raw: a.user_answer,
        p_latency_ms: 0,
      })
      if (attemptErr) console.error("[submit_attempt error]", attemptErr)

      // 2-2) grades 기록
      if (attemptId) {
        const { error: gradeErr } = await supabase.rpc("save_grade", {
          p_attempt_id: attemptId,
          p_label: correct ? "correct" : "wrong",
          p_feedback: correct ? "잘했어요!" : "틀렸습니다.",
          p_minimal_rewrite: null,
          p_error_tags: [],
          p_judge: "rule",
          p_evidence: {},
        })
        if (gradeErr) console.error("[save_grade error]", gradeErr)
      }

      results.push({
        item_id: a.item_id,
        user_answer: a.user_answer,
        expected,
        correct,
        accepted: allowed,
        reason: correct ? undefined : "일치하지 않음",
      })
    }

    // 3) 라이트너 갱신
    const { error: srsErr } = await supabase.rpc("update_srs", { p_session_id: session_id })
    if (srsErr) console.error("[update_srs error]", srsErr)

    // 4) 세션 종료
    const { error: completeErr } = await supabase.rpc("complete_session", {
      p_session_id: session_id,
    })
    if (completeErr) console.error("[complete_session error]", completeErr)

    return NextResponse.json({ results })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: "Unexpected server error" }, { status: 500 })
  }
}
