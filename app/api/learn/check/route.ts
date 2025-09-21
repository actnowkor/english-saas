// 경로: app/api/learn/check/route.ts
// 역할: 학습 세션 시작 전 무료 이용 가능 여부 및 이용권 상태 확인
// 의존관계: lib/supabase/server-client.ts, Supabase 함수 can_start_session
// 포함 함수: POST()

import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server-client"

export async function POST() {
  const supabase = await createClient()
  const { data: auth } = await supabase.auth.getUser()

  if (!auth?.user) {
    return NextResponse.json({ error: "Unauthorized: 로그인 필요" }, { status: 401 })
  }

  try {
    const { data, error } = await supabase.rpc("can_start_session", {
      p_user_id: auth.user.id,
    })

    if (error) throw error

    const payload = data ?? {
      can_start: false,
      reason: "UNKNOWN",
      free_sessions_used_today: 0,
      pro_until: null,
    }

    return NextResponse.json(payload)
  } catch (err: any) {
    console.error("[POST /api/learn/check] error", err?.message || err)
    return NextResponse.json({ error: err?.message ?? "서버 오류" }, { status: 500 })
  }
}