// 경로: app/api/sessions/[id]/result/route.ts
// 연관: public.get_session_result(uuid)
// 역할: DB 함수 get_session_result(uuid) 호출 → 결과 JSON 통째로 반환

import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server-client"

export async function GET(
  _req: Request,
  context: { params: { id: string } } | { params: Promise<{ id: string }> }
) {
  const params = await Promise.resolve((context as any).params)
  const session_id = params.id

  const supabase = await createClient()
  try {
    // 0) 소유권 확인 (요청자 == 세션 소유자)
    const { data: auth } = await supabase.auth.getUser()
    const user = auth?.user
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: s, error: sErr } = await supabase
      .from("sessions")
      .select("id, user_id")
      .eq("id", session_id)
      .single()
    if (sErr) {
      console.error("[result] load session error:", sErr)
      return NextResponse.json({ error: "세션 조회 실패" }, { status: 500 })
    }
    if (!s) {
      return NextResponse.json({ error: "세션을 찾을 수 없습니다." }, { status: 404 })
    }
    if (s.user_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { data, error } = await supabase.rpc("get_session_result", { p_session_id: session_id })
    if (error) {
      console.error("[RPC get_session_result] error:", error)
      return NextResponse.json({ error: "결과 조회 실패" }, { status: 500 })
    }
    if (!data) {
      return NextResponse.json({ error: "세션을 찾을 수 없습니다." }, { status: 404 })
    }
    return NextResponse.json(data)
  } catch (e: any) {
    console.error("[GET /api/sessions/:id/result] error:", e?.message || e)
    return NextResponse.json({ error: e?.message ?? "서버 오류" }, { status: 500 })
  }
}
