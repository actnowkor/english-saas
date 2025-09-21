// 경로: app/api/sessions/[id]/route.ts
// 역할: 세션 메타와 스냅샷을 조회하는 API 핸들러
// 의존관계: lib/supabase/server-client.ts, lib/logic/level-utils.ts
// 포함 함수: GET()

import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server-client"
import { extractAdjustmentFromStrategy } from "@/lib/logic/level-utils"

type SessionItemRow = {
  item_id: string
  order_index: number
  snapshot_json: any
}

type SessionResponse = {
  session: {
    session_id: string
    strategy: any
    adjustment: ReturnType<typeof extractAdjustmentFromStrategy>
    level_snapshot: { current_level: number; stats: any }
    items: Array<{
      item_id: string
      order_index: number
      concept_key?: string
      concept_ko?: string
      snapshot: any
    }>
  }
}

async function fetchConceptKoMap(supabase: any, keys: string[]) {
  const map = new Map<string, { display_name: string; description?: string }>()
  if (keys.length === 0) return map
  const tryTables = ["concepts", "concepts_levels_1_9", "concepts_levels"]
  for (const tbl of tryTables) {
    try {
      const { data, error } = await supabase
        .from(tbl)
        .select("concept_key, display_name, description")
        .in("concept_key", keys)
      if (!error && Array.isArray(data)) {
        for (const r of data) {
          const k = String(r.concept_key)
          if (!map.has(k)) {
            map.set(k, {
              display_name: String(r.display_name || k),
              description: r.description || undefined,
            })
          }
        }
        if (map.size === new Set(keys).size) break
      }
    } catch {
      // 무시하고 다음 테이블 시도
    }
  }
  return map
}
// fetchConceptKoMap: 개념 키 리스트를 받아 한국어 이름을 매핑한다.

export async function GET(
  req: Request,
  context: { params: { id: string } } | { params: Promise<{ id: string }> }
) {
  const params = await Promise.resolve((context as any).params)
  const sid = params.id

  const supabase = await createClient()
  const { data: auth } = await supabase.auth.getUser()
  const user = auth?.user
  if (!user) {
    return NextResponse.json({ error: "Unauthorized: 로그인 필요" }, { status: 401 })
  }

  try {
    const { data: sessionRow, error: sessionError } = await supabase
      .from("sessions")
      .select("id, user_id, strategy_json, target_item_count, started_at, status")
      .eq("id", sid)
      .single()
    if (sessionError || !sessionRow) throw sessionError ?? new Error("세션을 찾을 수 없습니다.")
    if (sessionRow.user_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { data: items, error: itemsError } = await supabase
      .from("session_items")
      .select("item_id, order_index, snapshot_json")
      .eq("session_id", sid)
      .order("order_index", { ascending: true })
    if (itemsError) throw itemsError

    const conceptKeys = Array.from(
      new Set(
        (items ?? [])
          .map((r: SessionItemRow) => String(r?.snapshot_json?.concept_key || ""))
          .filter((k) => k && k.length > 0)
      )
    )
    const koMap = await fetchConceptKoMap(supabase, conceptKeys)

    const strategy = sessionRow.strategy_json ?? {}
    const adjustment = extractAdjustmentFromStrategy(strategy)

    const { data: userRow } = await supabase
      .from("users")
      .select("current_level")
      .eq("id", user.id)
      .maybeSingle()

    const levelSnapshot = {
      current_level: Number(userRow?.current_level ?? adjustment.policy_level ?? 0),
      stats: strategy?.stats_snapshot ?? null,
    }

    const response: SessionResponse = {
      session: {
        session_id: sessionRow.id,
        strategy,
        adjustment,
        level_snapshot: levelSnapshot,
        items:
          items?.map((r: SessionItemRow) => {
            const conceptKey = String(r?.snapshot_json?.concept_key || "")
            const conceptName = conceptKey ? koMap.get(conceptKey)?.display_name || conceptKey : undefined
            return {
              item_id: r.item_id,
              order_index: r.order_index,
              concept_key: conceptKey || undefined,
              concept_ko: conceptName,
              snapshot: r.snapshot_json,
            }
          }) ?? [],
      },
    }

    return NextResponse.json(response)
  } catch (e: any) {
    console.error("[GET /api/sessions/:id] error:", e?.message || e)
    return NextResponse.json({ error: e?.message ?? "세션 로드 실패" }, { status: 500 })
  }
}
// GET: 특정 세션의 전략, 조정 정보, 문항 스냅샷을 반환한다.

// 사용법: 학습 페이지에서 세션을 불러올 때 호출한다.
