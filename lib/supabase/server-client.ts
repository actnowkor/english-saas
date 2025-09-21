// 경로: lib/supabase/server-client.ts
// 역할: 서버(라우트 핸들러/서버 컴포넌트)에서 사용할 Supabase 클라이언트 생성기
// 의존: @supabase/ssr v2, next/headers (cookies)

import { cookies } from "next/headers"
import { createServerClient, type CookieOptions } from "@supabase/ssr"

// 비동기로 변경됨
export async function createClient() {
  const cookieStore = await cookies() // ✅ await 필수

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options })
          } catch {
            // Route Handler의 read-only 쿠키 컨텍스트 예외 흡수
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: "", ...options })
          } catch {
            // 동일
          }
        },
      },
    }
  )
}

export type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>
