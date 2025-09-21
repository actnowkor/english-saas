// app/api/whoami/route.ts  (전체 교체)
import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createServerClient } from "@supabase/ssr"

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

type CookieToSet = { name: string; value: string; options?: Record<string, unknown> }

export async function GET() {
  const store = await cookies()

  const supabase = createServerClient(url, key, {
    cookies: {
      // 최신 @supabase/ssr: getAll / setAll 사용
      getAll() {
        return store.getAll().map(c => ({ name: c.name, value: c.value }))
      },
      setAll(cookiesToSet: CookieToSet[]) {
        cookiesToSet.forEach(({ name, value, options }) => {
          store.set(name, value, options)
        })
      },
    },
  })

  const { data: { user }, error } = await supabase.auth.getUser()
  return NextResponse.json({ user, error: error?.message ?? null })
}
