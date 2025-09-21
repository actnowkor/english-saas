// 경로: app/api/test/session-start/route.ts
// 역할: 테스트용 세션 생성 + 세션 아이템 스냅샷 로드 후 반환
// 의존: lib/supabase/server-client.ts (getServerClient)
//      DB: start_session(p_user_id uuid, p_count int) RETURNS uuid
//      테이블: session_items(snapshot_json에 source_ko, answer_en 등이 포함)

import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server-client"

export async function POST(req: Request) {
  try {
    const { limit = 10 } = await req.json()
    const supabase = await createClient()

    // 사용자 세션 확인
    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser()
    if (userErr || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // 1) 세션 생성 (DB 함수 호출)
    const { data: sessionId, error: startErr } = await supabase.rpc("start_session", {
      p_user_id: user.id,
      p_count: limit,
    })
    if (startErr || !sessionId) {
      console.error(startErr)
      return NextResponse.json({ error: "Failed to start session" }, { status: 500 })
    }

    // 2) 세션 아이템 로드 (스냅샷에 프롬프트/정답 존재한다고 가정)
    const { data: items, error: itemsErr } = await supabase
      .from("session_items")
      .select("item_id, order_index, snapshot_json")
      .eq("session_id", sessionId)
      .order("order_index", { ascending: true })

    if (itemsErr) {
      console.error(itemsErr)
      return NextResponse.json({ error: "Failed to load session items" }, { status: 500 })
    }

    // 3) 테스트 페이지에서 쓰기 좋은 형태로 변환
    const mapped = (items ?? []).map((row: any) => {
      const snap = row.snapshot_json || {}
      const allowed = parseAllowedVariants(snap)
      return {
        order_index: row.order_index,
        item_id: String(snap.id ?? row.item_id),
        prompt_ko: String(snap.source_ko ?? ""),
        answer_en: String(snap.answer_en ?? ""),
        allowed_variants: allowed,
      }
    })

    return NextResponse.json({
      session_id: sessionId,
      items: mapped,
    })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: "Unexpected server error" }, { status: 500 })
  }
}

// 스냅샷의 허용변형 필드 파싱 (allowed_variants_text | allowed_variants 등)
function parseAllowedVariants(snap: any): string[] | undefined {
  if (!snap) return undefined
  if (Array.isArray(snap.allowed_variants)) return snap.allowed_variants.map(String)
  if (typeof snap.allowed_variants_text === "string") {
    // 파이프/쉼표 구분 케이스 대비
    return snap.allowed_variants_text
      .split(/[|,]/)
      .map((s: string) => s.trim())
      .filter(Boolean)
  }
  return undefined
}
