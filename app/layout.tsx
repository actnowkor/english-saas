// 경로: app/layout.tsx
// 역할: 앱 전역 레이아웃을 정의하고 초기 인증 컨텍스트를 주입한다.
// 의존관계: @/hooks/use-auth, @/lib/supabase/server-client, @/lib/auth/app-user
// 포함 함수: resolveInitialUser(), RootLayout()

import type React from "react"
import type { Metadata } from "next"
import { Noto_Sans_KR } from "next/font/google"
import { GeistMono } from "geist/font/mono"
import { Analytics } from "@vercel/analytics/next"
import { Toaster } from "@/components/ui/toaster"
import { Suspense } from "react"
import { AuthProvider } from "@/hooks/use-auth"
import { ErrorBoundary } from "@/components/error-boundary"
import { FullPageLoader } from "@/components/loading-spinner"
import { createClient } from "@/lib/supabase/server-client"
import { buildAppUser, type AppUser, type ProfileRow } from "@/lib/auth/app-user"
import "./globals.css"

const notoSansKr = Noto_Sans_KR({
  subsets: ["latin"],
  weight: ["400", "500", "700", "900"],
  display: "swap",
  variable: "--font-noto-sans",
})

export const metadata: Metadata = {
  title: "EnglishLab - 영어 학습 플랫폼",
  description: "AI 기반 영어 학습을 위한 스마트 플랫폼",
  generator: "v0.app",
  keywords: ["영어학습", "English", "교육", "SRS", "spaced repetition"],
  authors: [{ name: "EnglishLab Team" }],
  viewport: "width=device-width, initial-scale=1",
  themeColor: "#000000",
}

async function resolveInitialUser(): Promise<AppUser | null> {
  try {
    const supabase = await createClient()
    const {
      data: { session },
    } = await supabase.auth.getSession()
    const supaUser = session?.user
    if (!supaUser) return null

    const { data, error } = await supabase
      .from("users")
      .select("id, display_name, current_level, onboarding_at")
      .eq("id", supaUser.id)
      .limit(1)
      .maybeSingle()

    const profile: ProfileRow | null = error || !data
      ? { id: supaUser.id, display_name: null, current_level: null, onboarding_at: null }
      : (data as ProfileRow)

    return buildAppUser({ supaUser, profile })
  } catch (err) {
    console.warn("[layout] failed to resolve initial user", (err as Error).message ?? err)
    return null
  }
}
// resolveInitialUser: 서버 세션 정보를 읽어 초기 사용자 객체를 생성한다.

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const initialUser = await resolveInitialUser()

  return (
    <html lang="ko">
      <body className={`font-sans ${notoSansKr.variable} ${GeistMono.variable}`}>
        <ErrorBoundary>
          <AuthProvider initialUser={initialUser}>
            <Suspense fallback={<FullPageLoader />}>
              {children}
              <Toaster />
              <Analytics />
            </Suspense>
          </AuthProvider>
        </ErrorBoundary>
      </body>
    </html>
  )
}
// RootLayout: 전역 레이아웃과 인증 컨텍스트를 결합해 앱을 렌더링한다.

