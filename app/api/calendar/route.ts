// 경로: app/api/calendar/route.ts
// 역할: 사용자의 월별 학습 날짜 집계(실데이터)

import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server-client"

export async function GET(req: Request) {
  const supabase = await createClient()
  const { data: auth } = await supabase.auth.getUser()
  const user = auth?.user
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const year = parseInt(searchParams.get("year") || "")
  const month = parseInt(searchParams.get("month") || "")

  if (!year || !month || month < 1 || month > 12) {
    return NextResponse.json({ error: "invalid year/month" }, { status: 400 })
  }

  const monthStart = new Date(year, month - 1, 1)
  const nextMonthStart = new Date(year, month, 1)

  try {
    const { data: sess } = await supabase
      .from("sessions")
      .select("id")
      .eq("user_id", user.id)
      .limit(5000)
    const sessionIds = Array.from(new Set((sess ?? []).map((s: any) => s.id)))
    let learnedDates: string[] = []
    if (sessionIds.length > 0) {
      const { data: atts } = await supabase
        .from("attempts")
        .select("submitted_at, session_id")
        .in("session_id", sessionIds)
        .gte("submitted_at", monthStart.toISOString())
        .lt("submitted_at", nextMonthStart.toISOString())

      const set = new Set<string>()
      for (const a of atts ?? []) {
        const d = new Date(a.submitted_at)
        if (!isNaN(d as any)) {
          const ymd = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
          set.add(ymd)
        }
      }
      learnedDates = Array.from(set).sort()
    }
    return NextResponse.json({ year, month, learnedDates })
  } catch (e: any) {
    console.error("[GET /api/calendar]", e?.message || e)
    return NextResponse.json({ year, month, learnedDates: [] })
  }
}
