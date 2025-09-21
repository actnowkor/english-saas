// 경로: app/api/levels/evaluate/route.ts
// 역할: 수동 호출용 레벨 평가 결과 제공 API
// 의존관계: lib/supabase/server-client.ts, lib/logic/level-utils.ts
// 포함 함수: GET()

import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server-client"
import { evaluateUserLevelProgress } from "@/lib/logic/level-utils"

export async function GET() {
  const supabase = await createClient()
  const { data: auth } = await supabase.auth.getUser()
  const user = auth?.user
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const evaluation = await evaluateUserLevelProgress(supabase, user.id)
    return NextResponse.json({ evaluation })
  } catch (e: any) {
    console.error("[GET /api/levels/evaluate]", e?.message || e)
    return NextResponse.json({ error: e?.message ?? "server error" }, { status: 500 })
  }
}
// GET: 현재 레벨 승급 가능 여부를 반환한다.

// 사용법: 관리용 도구나 진단 화면에서 호출한다.

