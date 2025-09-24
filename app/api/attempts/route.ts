// 경로: app/api/attempts/route.ts
// 역할: (단건 또는 배치) 답안 제출 → attempts 생성(RPC) → 스냅샷 기준 룰 채점 → grades 저장(RPC)
// 전제: attempts와 grades는 1:1, 채점은 반드시 session_items.snapshot_json 기준
// 연관: app/learn/page.tsx, app/api/sessions/[id]/complete/route.ts, DB RPC grade_attempts_batch

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
  // 문장부호/기호를 공백으로 치환(하이픈/밑줄/따옴표 포함)
  const noPunct = str
    .replace(/[\.,!?;:\"'`~@#$%^&*()\[\]{}<>/\\|+=_-]+/g, " ")
  // 공백 정리
  return noPunct.trim().replace(/\s+/g, " ")
}
function parseList(raw: any): string[] {
  const t = typeof raw === "string" ? raw : ""
  return t
    .split(/\r?\n|;|\|/g)
    .map((x) => normalize(x))
    .filter((x) => x.length > 0)
}

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

    // 4) 제출→채점 정보 구성(루프) 후 배치 RPC 호출
    const batchPayload: Array<{
      item_id: string
      answer_raw: string
      latency_ms: number | null
      label: "correct" | "variant" | "near_miss" | "wrong"
      feedback: string
      minimal_rewrite: string | null
      error_tags: any[]
      judge: string
      evidence: Record<string, unknown>
    }> = []

    for (const it of items) {
      const snap = snapMap.get(it.item_id)
      if (!snap) {
        return NextResponse.json({ error: `세션에 없는 문항: ${it.item_id}` }, { status: 400 })
      }

      const correct = normalize(snap?.answer_en ?? "")
      const variants = parseList(snap?.allowed_variants_text)
      const nearMisses = parseList(snap?.near_misses_text)

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

      batchPayload.push({
        item_id: it.item_id,
        answer_raw: it.answer ?? "",
        latency_ms: typeof it.latency_ms === "number" ? it.latency_ms : null,
        label,
        feedback,
        minimal_rewrite: label === "wrong" || label === "near_miss" ? (snap?.answer_en ?? null) : null,
        error_tags: [],
        judge: "rule",
        evidence: {},
      })
    }

    if (batchPayload.length === 0) {
      return NextResponse.json({ error: "채점 대상이 없습니다." }, { status: 400 })
    }

    const { data: stored, error: batchErr } = await supabase.rpc("grade_attempts_batch", {
      p_session_id: session_id,
      p_attempts: batchPayload,
    })

    if (batchErr) {
      console.error("[grade_attempts_batch error]", batchErr)
      return NextResponse.json({ error: "채점 저장 실패" }, { status: 500 })
    }

    const saved = stored?.length ?? 0
    const results =
      stored?.map((row: any) => ({
        item_id: row.item_id as string,
        attempt_id: row.attempt_id as string,
        label: row.label as "correct" | "variant" | "near_miss" | "wrong",
        feedback: row.feedback as string,
      })) ?? []

    return NextResponse.json({ ok: true, saved, results })
  } catch (e: any) {
    console.error("[POST /api/attempts] error:", e?.message || e)
    return NextResponse.json({ error: e?.message ?? "서버 오류" }, { status: 500 })
  }
}
