// 경로: app/api/entitlements/me/route.ts
// 역할: 현재 로그인 사용자의 권리 요약 정보를 반환하는 API
// 의존관계: lib/supabase/server-client.ts, lib/supabase/service-client.ts, lib/payments/access-summary.ts
// 포함 함수: GET()

import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server-client"
import { createServiceClient } from "@/lib/supabase/service-client"
import { loadAccessSummary } from "@/lib/payments/access-summary"

export async function GET() {
  const supabase = await createClient()
  const service = createServiceClient()
  const { data: auth } = await supabase.auth.getUser()

  if (!auth?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const summary = await loadAccessSummary(service, auth.user.id)
    return NextResponse.json(summary)
  } catch (err) {
    console.error("[GET /api/entitlements/me]", (err as any)?.message || err)
    return NextResponse.json({ error: (err as any)?.message ?? "server error" }, { status: 500 })
  }
}
// GET: 로그인 사용자의 결제/권리 현황을 JSON으로 반환한다.
// 사용처: /api/entitlements/me 엔드포인트로 호출된다.
