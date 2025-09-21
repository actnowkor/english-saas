// app/api/onboarding/complete/route.ts
// 온보딩에서 선택한 레벨을 최초 1회만 DB(users)에 기록하는 API
// 핵심: @supabase/ssr + cookies 어댑터(getAll/setAll) 사용

import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createServerClient } from "@supabase/ssr"

// "L1" ~ "L9" → 1 ~ 9
function parseLevelStringToInt(input: unknown): number | null {
  if (typeof input !== "string") return null
  const m = /^L([1-9])$/.exec(input.trim())
  if (!m) return null
  const n = Number(m[1])
  return n >= 1 && n <= 9 ? n : null
}

export async function POST(req: Request) {
  try {
    // 0) Next 15: Dynamic API는 미리 await 해서 값을 확보
    const cookieStore = await cookies()

    // 1) Supabase 서버 클라이언트 (cookies 어댑터 형태로 전달)
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          // 서버에서 읽기
          getAll() {
            // Next 15: cookieStore는 getAll() 제공
            return cookieStore.getAll()
          },
          // 서버에서 쓰기(토큰 갱신 등)
          setAll(cookiesToSet) {
            // Server Component 등 일부 환경에선 set이 막혀 있을 수 있어 try/catch 권장 (공식 가이드)
            try {
              cookiesToSet.forEach(({ name, value, options }) => {
                cookieStore.set(name, value, options)
              })
            } catch {
              // 무시해도 됨: 미들웨어에서 세션을 갱신하거나,
              // 이번 요청에서 토큰 갱신이 필요없는 경우가 대부분
            }
          },
        },
      }
    )

    // 2) 로그인 사용자 확인
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser()
    if (authErr || !user) {
      return NextResponse.json(
        { ok: false, message: "로그인이 필요합니다." },
        { status: 401 }
      )
    }

    // 3) 입력 파싱/검증
    const body = await req.json().catch(() => ({} as any))
    const levelInt = parseLevelStringToInt(body?.level)
    if (!levelInt) {
      return NextResponse.json(
        { ok: false, message: "유효하지 않은 level 값입니다. (예: L1 ~ L9)" },
        { status: 400 }
      )
    }

    // ⚠️ 컬럼명 주의: 프로젝트에서 실제 사용하는 컬럼이 onboarding_at 인지 onboarded_at 인지 확인하세요.
    // 아래는 onboarded_at 기준으로 작성했습니다.
    // 4) DB 업데이트 (최초 1회만)
    const { data, error } = await supabase
      .from("users")
      .update({
        current_level: levelInt,            // 정수 1~9
        onboarded_at: new Date().toISOString(), // 완료 시각
      })
      .eq("id", user.id)          // 본인 레코드만
      .is("current_level", null)  // 아직 설정 전 상태에서만
      .select("id")
      .limit(1)

    if (error) {
      return NextResponse.json(
        { ok: false, message: error.message ?? "DB 업데이트 오류" },
        { status: 500 }
      )
    }

    // 이미 완료(멱등)
    if (!data || data.length === 0) {
      return NextResponse.json(
        { ok: true, alreadyCompleted: true, message: "이미 온보딩을 완료했습니다." },
        { status: 409 }
      )
    }

    // 최초 완료
    return NextResponse.json(
      { ok: true, alreadyCompleted: false, message: "온보딩 완료" },
      { status: 200 }
    )
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, message: e?.message ?? "알 수 없는 오류가 발생했습니다." },
      { status: 500 }
    )
  }
}
