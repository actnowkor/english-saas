// app/signin/page.tsx (전체 교체)
"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuth } from "@/hooks/use-auth"
import { useTranslation } from "@/lib/i18n"
import { useToast } from "@/hooks/use-toast"
import { Loader2 } from "lucide-react"

export default function SignInPage() {
  // 상태: 로그인 버튼 로딩
  const [isSigningIn, setIsSigningIn] = useState(false)

  // 훅: 인증/라우팅/다국어/토스트
  const { user, signIn } = useAuth()
  const { t } = useTranslation()
  const { toast } = useToast()
  const router = useRouter()

  // 로그인 성공 시 라우팅 (온보딩 or 대시보드)
  useEffect(() => {
    if (user) {
      if (user.isFirstTime) {
        router.push("/onboarding")
      } else {
        router.push("/dashboard")
      }
    }
  }, [user, router])

  // 클릭: Google OAuth 시작
  const handleSignIn = async () => {
    setIsSigningIn(true)
    try {
      toast({
        title: "Google 로그인",
        description: "구글 인증을 진행합니다",
        duration: 1500,
      })
      await signIn()
      // 이후 onAuthStateChange로 user가 설정되면 useEffect가 라우팅 처리
    } catch (error) {
      toast({
        title: t("auth.error"),
        description: error instanceof Error ? error.message : t("common.error"),
        variant: "destructive",
      })
    } finally {
      setIsSigningIn(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-xl">E</span>
          </div>
          <CardTitle className="text-2xl">{t("auth.title")}</CardTitle>
          <CardDescription>Google 계정으로 간편하게 시작하세요</CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* ✅ Mock 토글/개발자용 경고 배너 완전 제거 */}

          <Button onClick={handleSignIn} disabled={isSigningIn} className="w-full" size="lg">
            {isSigningIn ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t("auth.signing_in")}
              </>
            ) : (
              <>
                <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                {t("auth.google_signin")}
              </>
            )}
          </Button>

          <div className="text-center text-sm text-muted-foreground">
            <select className="bg-transparent border-none text-sm" aria-label="언어 선택">
              <option value="ko">한국어</option>
              <option value="ja" disabled>
                日本語 (준비중)
              </option>
            </select>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
