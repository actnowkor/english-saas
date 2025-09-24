// 경로: app/api/attempts/route.ts
// 역할: (단건 또는 배치) 답안 제출 → attempts 생성(RPC) → 스냅샷 기준 룰 채점 → grades 저장(RPC)
// 전제: attempts와 grades는 1:1, 채점은 반드시 session_items.snapshot_json 기준
// 연관: app/learn/page.tsx, app/api/sessions/[id]/complete/route.ts, DB RPC submit_attempt/save_grade

import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server-client"

// --- 입력 스키마(둘 중 하나)
// 1) 단건: { session_id, item_id, answer, latency_ms? }
// 2) 배치: { session_id, answers: [{ item_id, answer, latency_ms? }, ...] }
type SingleBody = {
  session_id: string
  item_id: string
  answer: string
  latency_ms?: number
}
type BatchBody = {
  session_id: string
  answers: { item_id: string; answer: string; latency_ms?: number }[]
}

// 기본 정규화: 대소문자 무시 + 문장부호 제거 + 공백 정리
function normalize(s: string) {
  const str = (s ?? "").toLowerCase()
  const noPunct = str.replace(/[\.,!?;:\"'`~@#$%^&*()\[\]{}<>/\\|+=_-]+/g, " ")
  return noPunct.trim().replace(/\s+/g, " ")
}
// normalize: 문자열을 소문자로 치환하고 문장부호를 제거한다.

function parseList(...rawValues: any[]): string[] {
  const seen = new Set<string>()
  const results: string[] = []

  for (const raw of rawValues) {
    if (raw == null) continue

    const values = Array.isArray(raw)
      ? raw.map((v) => String(v))
      : typeof raw === "string"
      ? raw.split(/\r?\n|;|\||,/g)
      : []

    for (const value of values) {
      const norm = normalize(value)
      if (!norm || seen.has(norm)) continue
      seen.add(norm)
      results.push(norm)
    }
  }

  return results
}
// parseList: 문자열/배열 입력을 정규화된 답안 목록으로 변환한다.

export async function POST(req: Request) {
  const supabase = await createClient()

  try {
    // 0) 인증
    const { data: auth, error: authErr } = await supabase.auth.getUser()
    if (authErr || !auth?.user) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 })
    }
    const userId = auth.user.id

    // 1) 입력 파싱: 단건/배치 자동 판별
    const raw = await req.json()
    let session_id: string | undefined
    let items: { item_id: string; answer: string; latency_ms?: number }[] = []

    if (raw && typeof raw === "object" && Array.isArray(raw.answers)) {
      // 배치 모드
      const body = raw as BatchBody
      session_id = body.session_id
      items = body.answers
    } else {
      // 단건 모드
      const body = raw as SingleBody
      session_id = body.session_id
      if (body.item_id && typeof body.answer === "string") {
        items = [{ item_id: body.item_id, answer: body.answer, latency_ms: body.latency_ms }]
      }
    }

    if (!session_id || items.length === 0) {
      return NextResponse.json({ error: "잘못된 요청" }, { status: 400 })
    }

    // 2) 세션 소유권 확인 (RLS 보조 가드)
    const { data: s, error: sErr } = await supabase
      .from("sessions")
      .select("id")
      .eq("id", session_id)
      .eq("user_id", userId)
      .single()
    if (sErr || !s) {
      return NextResponse.json({ error: "세션을 찾을 수 없거나 권한이 없습니다." }, { status: 403 })
    }

    // 3) 필요한 스냅샷을 한 번에 로드(N+1 방지)
    const itemIds = Array.from(new Set(items.map((a) => a.item_id)))
    const { data: snaps, error: siErr } = await supabase
      .from("session_items")
      .select("item_id, snapshot_json")
      .eq("session_id", session_id)
      .in("item_id", itemIds)

    if (siErr) {
      return NextResponse.json({ error: "스냅샷 로드 실패" }, { status: 500 })
    }
    const snapMap = new Map(snaps?.map((r) => [r.item_id, r.snapshot_json]) ?? [])

    // 4) 제출→채점→grade 저장 루프
    let saved = 0
    const results: Array<{ item_id: string; attempt_id: string; label: "correct" | "variant" | "near_miss" | "wrong"; feedback: string }> = []

    for (const it of items) {
      const snap = snapMap.get(it.item_id)
      if (!snap) {
        return NextResponse.json({ error: `세션에 없는 문항: ${it.item_id}` }, { status: 400 })
      }

      // 스냅샷 기준 정답/허용/근접오답
      const correct = normalize(snap?.answer_en ?? "")
      const variants = parseList(snap?.allowed_variants, snap?.allowed_variants_text)
      const nearMisses = parseList(snap?.near_misses, snap?.near_misses_text)

      // 제출 저장 (submit_attempt RPC) — attempts 1건 생성
      const { data: attempt_id, error: subErr } = await supabase.rpc("submit_attempt", {
        p_session_id: session_id,
        p_item_id: it.item_id,
        p_answer_raw: it.answer ?? "",
        p_latency_ms: it.latency_ms ?? null,
      })
      if (subErr || !attempt_id) {
        return NextResponse.json({ error: "시도 저장 실패" }, { status: 500 })
      }

      // 룰 채점 (스냅샷 기준)
      const userNorm = normalize(it.answer ?? "")
      let label: "correct" | "variant" | "near_miss" | "wrong" = "wrong"
      if (userNorm === correct) label = "correct"
      else if (variants.includes(userNorm)) label = "variant"
      else if (nearMisses.includes(userNorm)) label = "near_miss"

      const feedback =
        label === "correct"
          ? "정답입니다!"
          : label === "variant"
          ? "허용 가능한 표현입니다."
          : label === "near_miss"
          ? "거의 맞았어요! 조금만 더 다듬어보세요."
          : `정답: ${snap?.answer_en ?? ""}`

      // 채점 저장 (save_grade RPC) — grades 1건(1:1) 저장
      const { error: gErr } = await supabase.rpc("save_grade", {
        p_attempt_id: attempt_id,
        p_label: label,
        p_feedback: feedback,
        p_minimal_rewrite:
          label === "wrong" || label === "near_miss" ? (snap?.answer_en ?? null) : null,
        p_error_tags: [],   // 초기 비움 → 추후 AI 채점시 채움
        p_judge: "rule",
        p_evidence: {},
      })
      if (gErr) {
        return NextResponse.json({ error: "채점 저장 실패" }, { status: 500 })
      }

      saved += 1
      results.push({ item_id: it.item_id, attempt_id, label, feedback })
    }

    // 응답: 단건/배치 공통
    // - learn(page.tsx)의 배치 호출은 상태만 확인하므로 충분
    // - 단건 호출을 프론트에서 사용할 경우 label/feedback을 즉시 표시 가능
    return NextResponse.json({ ok: true, saved, results })
  } catch (e: any) {
    console.error("[POST /api/attempts] error:", e?.message || e)
    return NextResponse.json({ error: e?.message ?? "서버 오류" }, { status: 500 })
  }
}
