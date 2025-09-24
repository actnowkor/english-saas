// 경로: app/api/sessions/[id]/route.ts
// 역할: 학습 세션(진행 중/완료) 상세 데이터를 조회하는 API
// 의존관계: lib/supabase/server-client.ts, supabase RPC get_bundle_result
// 포함 함수: GET()

import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server-client"

interface SessionItemRow {
  item_id: string
  order_index: number
  snapshot: any
  type?: string | null
  level?: string | null
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
      // 다음 후보 테이블로 시도
    }
  }
  return map
}
// fetchConceptKoMap: 개념 키 목록을 받아 한글 이름을 매핑한다.

export async function GET(
  _req: Request,
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
      .select("id, user_id, strategy_json, target_item_count, started_at, status, bundle_id")
      .eq("id", sid)
      .single()
    if (sessionError || !sessionRow) throw sessionError ?? new Error("세션을 찾을 수 없습니다.")
    if (sessionRow.user_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    let rawItems: SessionItemRow[] = []
    let strategy = sessionRow.strategy_json ?? {}

    if (sessionRow.status === "completed" && sessionRow.bundle_id) {
      const { data: bundleData, error: bundleError } = await supabase.rpc("get_bundle_result", {
        p_bundle_id: sessionRow.bundle_id,
      })
      if (bundleError) throw bundleError
      const summary = (bundleData as any)?.summary ?? {}
      const metadata = summary?.metadata ?? {}
      strategy = metadata?.strategy ?? strategy ?? {}
      rawItems = (Array.isArray(summary?.items) ? summary.items : []).map((item: any) => ({
        item_id: String(item?.item_id ?? ""),
        order_index: Number(item?.order_index ?? 0),
        snapshot: item?.snapshot ?? {},
        type: item?.type ?? null,
        level: item?.level ?? null,
      }))
    } else {
      const { data: items, error: itemsError } = await supabase
        .from("session_items")
        .select("item_id, order_index, snapshot_json")
        .eq("session_id", sid)
        .order("order_index", { ascending: true })
      if (itemsError) throw itemsError
      rawItems = (items ?? []).map((r: any) => ({
        item_id: String(r.item_id),
        order_index: Number(r.order_index ?? 0),
        snapshot: r.snapshot_json ?? {},
        type: (r?.snapshot_json?.type as string | undefined) ?? null,
        level: (r?.snapshot_json?.level as string | undefined) ?? null,
      }))
    }

    rawItems.sort((a, b) => a.order_index - b.order_index)

    const conceptKeys = Array.from(
      new Set(
        rawItems
          .map((r) => String(r?.snapshot?.concept_key || ""))
          .filter((k) => k && k.length > 0)
      )
    )
    const koMap = await fetchConceptKoMap(supabase, conceptKeys)

    const { data: userRow } = await supabase
      .from("users")
      .select("current_level")
      .eq("id", user.id)
      .maybeSingle()

    const levelSnapshot = {
      current_level: Number(userRow?.current_level ?? 0),
      stats: strategy?.stats_snapshot ?? null,
    }

    const response = {
      session: {
        session_id: sessionRow.id,
        strategy,
        level_snapshot: levelSnapshot,
        items: rawItems.map((r) => {
          const conceptKey = String(r?.snapshot?.concept_key || "")
          const conceptName = conceptKey ? koMap.get(conceptKey)?.display_name || conceptKey : undefined
          return {
            item_id: r.item_id,
            order_index: r.order_index,
            concept_key: conceptKey || undefined,
            concept_ko: conceptName,
            type: r.type ?? (r.snapshot?.type as string | undefined) ?? null,
            level: r.level ?? (r.snapshot?.level as string | undefined) ?? null,
            snapshot: r.snapshot,
          }
        }),
      },
    }

    return NextResponse.json(response)
  } catch (e: any) {
    console.error("[GET /api/sessions/:id] error:", e?.message || e)
    return NextResponse.json({ error: e?.message ?? "세션 로드 실패" }, { status: 500 })
  }
}
// GET: 세션 상태에 따라 번들이나 세션 아이템을 기반으로 상세 정보를 반환한다.

// 용도: 학습 화면 및 히스토리 상세에서 세션 정보를 요청한다.
