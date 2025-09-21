// middleware.ts
import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return req.cookies.getAll().map(c => ({ name: c.name, value: c.value }))
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          res.cookies.set({ name, value, ...options })
        })
      },
    },
  })

  const { data: { session } } = await supabase.auth.getSession()
  const path = req.nextUrl.pathname

  const isPublic =
    path.startsWith("/signin") || path.startsWith("/auth/callback") ||
    path === "/" || path.startsWith("/_next") || path.startsWith("/favicon")

  const needsAuth =
    path.startsWith("/dashboard") || path.startsWith("/learn") ||
    path.startsWith("/history") || path.startsWith("/settings") ||
    path.startsWith("/admin")

  if (needsAuth && !session) {
    const redirectUrl = new URL("/signin", req.url)
    redirectUrl.searchParams.set("redirectedFrom", path)
    return NextResponse.redirect(redirectUrl)
  }
  if (path.startsWith("/signin") && session) {
    const to = req.nextUrl.searchParams.get("redirectedFrom") || "/dashboard"
    return NextResponse.redirect(new URL(to, req.url))
  }
  return res
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"] }
