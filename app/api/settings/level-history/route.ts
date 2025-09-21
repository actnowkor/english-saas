// 경로: app/api/settings/level-history/route.ts
// 역할: 사용자 레벨 변동 이력 조회 API
// 의존관계: lib/supabase/server-client.ts
// 포함 함수: GET()

import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server-client"

export async function GET() {
  const supabase = await createClient()
  const { data: auth } = await supabase.auth.getUser()
  const user = auth?.user
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const { data, error } = await supabase
      .from("user_level_history")
      .select("level, source, changed_at")
      .eq("user_id", user.id)
      .order("changed_at", { ascending: false })
      .limit(50)

    if (error) throw error

    return NextResponse.json({
      items: (data ?? []).map((row) => ({
        level: Number(row.level ?? 0),
        source: row.source ?? "unknown",
        changed_at: row.changed_at,
      })),
    })
  } catch (e: any) {
    console.error("[GET /api/settings/level-history]", e?.message || e)
    return NextResponse.json({ error: e?.message ?? "server error" }, { status: 500 })
  }
}
// GET: 사용자 본인의 레벨 이력을 반환한다.

// 사용법: 설정 페이지에서 레벨 타임라인을 불러올 때 호출한다.

