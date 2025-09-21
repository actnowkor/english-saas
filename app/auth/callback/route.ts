// app/auth/callback/route.ts
import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export async function GET(req: NextRequest) {
  // app/auth/callback/route.ts 의 GET 함수 맨 위 근처에 추가
  console.log("[callback] req cookies:", req.cookies.getAll().map(c => c.name))

  const u = new URL(req.url)
  const code = u.searchParams.get("code")
  const redirectedFrom = u.searchParams.get("redirectedFrom") || "/dashboard"

  // 최종 응답 만들기 (여기에 쿠키를 '직접' 붙임)
  const res = NextResponse.redirect(new URL(redirectedFrom, u.origin))

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return req.cookies.getAll().map(c => ({ name: c.name, value: c.value }))
      },
      setAll(cookiesToSet) {
        // 🔎 어떤 쿠키들이 설정되는지 모두 출력
        console.log("[callback] setAll:", cookiesToSet.map(c => c.name))
        cookiesToSet.forEach(({ name, value, options }) => {
          res.cookies.set({ name, value, ...options })
        })
      },
    },
  })

  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    console.log("[callback] exchangeCodeForSession:", { error: error?.message, user: data?.user?.id })
  }

  // 🔎 최종 응답에 붙은 Set-Cookie 헤더 확인
  console.log("[callback] response Set-Cookie:", res.headers.get("set-cookie"))
  return res
}
