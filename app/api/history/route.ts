// 경로: app/api/history/route.ts
// 역할: 최근 세션 번들 기반 학습 이력 요약 반환
// 의존관계: lib/supabase/server-client.ts, public.session_bundles
// 포함 함수: GET()

import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server-client"

type HistoryRow = {
  session_id: string
  session_type: "standard" | "review_only" | "new_only" | "weakness"
  date: string
  correct_rate: number
  time_spent_sec: number
  total_items: number
}

function normalizeSessionType(type: string | undefined): HistoryRow["session_type"] {
  if (type === "review_only" || type === "new_only" || type === "weakness") return type
  return "standard"
}

export async function GET() {
  const supabase = await createClient()

  const { data: auth } = await supabase.auth.getUser()
  const user = auth?.user
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const { data: bundles, error } = await supabase
      .from("session_bundles")
      .select("id, started_at, ended_at, summary_json, bundle_seq")
      .eq("user_id", user.id)
      .order("bundle_seq", { ascending: false })
      .limit(30)

    if (error) throw error

    const rows: HistoryRow[] = []
    for (const bundle of bundles ?? []) {
      const summary = (bundle as any)?.summary_json ?? {}
      const metadata = summary?.metadata ?? {}
      const metrics = summary?.metrics ?? {}
      const strategy = metadata?.strategy ?? {}
      const total = Number(metrics?.total_items ?? 0)
      const correct = Number(metrics?.correct_items ?? 0)
      const rate = total > 0 ? Math.round((correct / total) * 100) : 0
      const durationSec = Math.max(0, Math.round(Number(metrics?.duration_ms ?? 0) / 1000))
      const sessionId = String(metadata?.session_id ?? (bundle?.session_ids?.[0] ?? bundle.id))
      rows.push({
        session_id: sessionId,
        session_type: normalizeSessionType(strategy?.type as string | undefined),
        date: metadata?.started_at ?? (bundle?.started_at as string) ?? new Date().toISOString(),
        correct_rate: rate,
        time_spent_sec: durationSec,
        total_items: total,
      })
    }

    return NextResponse.json(rows)
  } catch (e: any) {
    console.error("[GET /api/history]", e?.message || e)
    return NextResponse.json({ error: e?.message ?? "server error" }, { status: 500 })
  }
}

// GET: 최근 번들 요약을 기반으로 학습 이력을 반환한다.
