// 경로: app/api/sessions/route.ts
// 역할: 세션 생성 및 미완료 세션 조회 API 핸들러
// 의존관계: lib/supabase/server-client.ts
// 포함 함수: GET(), POST()

import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server-client"

type ClientType = "standard" | "new_only" | "review_only" | "weakness"
type DbType = "new_only" | "mix" | "review_only" | "weak_focus"

type SessionPostBody = {
  type?: ClientType | string
  count?: number
}

type CreateSessionResponse = {
  session_id: string
  strategy?: any
}

function normalizeType(t?: string): DbType {
  const x = String(t || "").trim()
  const map: Record<string, DbType> = {
    standard: "mix",
    weakness: "weak_focus",
    new_only: "new_only",
    mix: "mix",
    review_only: "review_only",
    weak_focus: "weak_focus",
  }
  return map[x] ?? "new_only"
}
// normalizeType: 클라이언트에서 받은 타입을 DB에서 쓰는 문자열로 정규화한다.

export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const active = url.searchParams.get("active")
    if (!active) {
      return NextResponse.json({ error: "잘못된 요청" }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: auth } = await supabase.auth.getUser()
    const user = auth?.user
    if (!user) {
      return NextResponse.json({ error: "Unauthorized: 로그인 필요" }, { status: 401 })
    }

    const { data: rows, error } = await supabase
      .from("sessions")
      .select("id, started_at, status, ended_at")
      .eq("user_id", user.id)
      .is("ended_at", null)
      .order("started_at", { ascending: false })
      .limit(1)

    if (error) throw error

    const sid = rows && rows.length > 0 ? rows[0].id : null
    return NextResponse.json({ session_id: sid })
  } catch (e: any) {
    console.error("[GET /api/sessions?active=1] error:", e?.message || e)
    return NextResponse.json({ error: e?.message ?? "서버 오류" }, { status: 500 })
  }
}
// GET: 활성 세션을 조회해 learn 페이지가 이어서 진행할 수 있게 한다.

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: auth } = await supabase.auth.getUser()
  const user = auth?.user
  if (!user) {
    return NextResponse.json({ error: "Unauthorized: 로그인 필요" }, { status: 401 })
  }

  try {
    const body: SessionPostBody = await req.json().catch(() => ({}))
    const p_type = normalizeType(body?.type)
    const p_count = Number.isFinite(Number(body?.count)) ? Number(body?.count) : null

    const { data: rpcResult, error: rpcError } = await supabase.rpc("start_session_custom", {
      p_user_id: user.id,
      p_type,
      p_count,
    })
    if (rpcError) throw rpcError

    const sessionIdRaw = rpcResult
    if (!sessionIdRaw) throw new Error("세션 생성 결과가 없습니다.")
    const sessionId = typeof sessionIdRaw === "string" ? sessionIdRaw : String(sessionIdRaw)

    let payload: CreateSessionResponse = { session_id: sessionId }

    const { data: sessionRow, error: sessionError } = await supabase
      .from("sessions")
      .select("strategy_json")
      .eq("id", sessionId)
      .maybeSingle()

    if (!sessionError && sessionRow?.strategy_json) {
      const strategy = sessionRow.strategy_json
      payload = {
        session_id: sessionId,
        strategy,
      }
    }

    return NextResponse.json(payload)
  } catch (e: any) {
    console.error("[POST /api/sessions] error:", e?.message || e)
    return NextResponse.json({ error: e?.message ?? "세션 생성 실패" }, { status: 500 })
  }
}
// POST: 정책 기반 RPC를 호출해 세션을 생성하고 전략 메타를 전달한다.

// 사용법: 대시보드 학습 시작 카드에서 세션 생성 요청 시 호출한다.


