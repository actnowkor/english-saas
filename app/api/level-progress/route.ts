// 경로: app/api/level-progress/route.ts
// 역할: 학습 레벨 평가 통계를 반환하는 API 엔드포인트
// 의존관계: lib/supabase/server-client.ts, lib/logic/level-utils.ts
// 포함 함수: GET()

import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server-client"
import { evaluateUserLevelProgress } from "@/lib/logic/level-utils"

export async function GET() {
  const supabase = await createClient()
  const { data: auth } = await supabase.auth.getUser()
  const user = auth?.user
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const evaluation = await evaluateUserLevelProgress(supabase, user.id)
    const currentLevel = evaluation.current_level
    const stats = evaluation.stats
    return NextResponse.json({ current_level: currentLevel, stats })
  } catch (error: any) {
    console.error("[GET /api/level-progress]", error?.message || error)
    return NextResponse.json({ error: "failed" }, { status: 500 })
  }
}
// GET: 현재 레벨과 최근 학습 지표를 반환한다.

// 사용법: 학습 시작 카드/페이지에서 레벨 지표를 보여줄 때 호출한다.
