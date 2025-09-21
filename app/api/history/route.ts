// 경로: app/api/history/route.ts
// 역할: 로그인 사용자의 최근 학습 세션 목록을 요약(정답률/문항수/걸린시간)으로 반환
// 관계: 프론트 app/history/page.tsx -> GET /api/history, 각 세션 리플레이는 /history/[sessionId]

import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server-client"

export async function GET() {
  const supabase = await createClient()

  // 인증 사용자 확인
  const { data: auth } = await supabase.auth.getUser()
  const user = auth?.user
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    // 최근 세션 20개 조회 (필요 필드만)
    const { data: sessions, error } = await supabase
      .from("sessions")
      .select("id, started_at, ended_at, strategy_json")
      .eq("user_id", user.id)
      .order("started_at", { ascending: false })
      .limit(20)

    if (error) throw error

    const result: Array<{
      session_id: string
      session_type: "standard" | "review_only" | "new_only" | "weakness"
      date: string
      correct_rate: number
      time_spent_sec: number
      total_items: number
    }> = []

    for (const s of sessions ?? []) {
      const sid = s.id as string
      // 결과 요약을 RPC로 가져와 총/정답 수를 계산
      const { data: r } = await supabase.rpc("get_session_result", { p_session_id: sid })
      const total = Number(r?.total ?? 0)
      const correct = Number(r?.correct ?? 0)
      const rate = total > 0 ? Math.round((correct / total) * 100) : 0

      // 시간: started_at~ended_at 차이(초), 없으면 0
      const started = s.started_at ? new Date(s.started_at as string).getTime() : 0
      const ended = s.ended_at ? new Date(s.ended_at as string).getTime() : started
      const durSec = started > 0 ? Math.max(0, Math.round((ended - started) / 1000)) : 0

      // 타입: strategy_json.type 있으면 사용, 없으면 standard
      const t = (s.strategy_json as any)?.type as string | undefined
      const session_type = (t === "review_only" || t === "new_only" || t === "weakness") ? t : "standard"

      result.push({
        session_id: sid,
        session_type,
        date: s.started_at ?? new Date().toISOString(),
        correct_rate: rate,
        time_spent_sec: durSec,
        total_items: total,
      })
    }

    return NextResponse.json(result)
  } catch (e: any) {
    console.error("[GET /api/history]", e?.message || e)
    return NextResponse.json({ error: e?.message ?? "server error" }, { status: 500 })
  }
}

