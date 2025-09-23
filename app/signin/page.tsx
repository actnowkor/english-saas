// 경로: app/signin/page.tsx
// 역할: 로그인 페이지에서 OAuth 흐름과 인앱 브라우저 안내를 처리한다.
// 의존관계: @/hooks/use-auth, @/lib/device/is-inapp-browser, @/components/ui/button 등
// 포함 함수: SignInPage()

"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/hooks/use-auth"
import { isInAppBrowser } from "@/lib/device/is-inapp-browser"
import { useTranslation } from "@/lib/i18n"

export default function SignInPage() {
  const [isSigningIn, setIsSigningIn] = useState(false)
  const [isInApp, setIsInApp] = useState(false)
  const [showInAppGuide, setShowInAppGuide] = useState(false)
  const [latestOauthUrl, setLatestOauthUrl] = useState<string | null>(null)

  const { user, signIn } = useAuth()
  const { t } = useTranslation()
  const { toast } = useToast()
  const router = useRouter()

  useEffect(() => {
    if (user) {
      if (user.isFirstTime) {
        router.push("/onboarding")
      } else {
        router.push("/dashboard")
      }
    }
  }, [user, router])

  useEffect(() => {
    if (typeof window === "undefined") return
    const inApp = isInAppBrowser()
    setIsInApp(inApp)
    if (inApp) {
      setShowInAppGuide(true)
    }
  }, [])

  const handleSignIn = async () => {
    setIsSigningIn(true)
    try {
      const oauthUrl = await signIn()
      if (!oauthUrl) {
        throw new Error(t("auth.oauth_url_missing"))
      }
      setLatestOauthUrl(oauthUrl)

      if (isInApp) {
        const popup = window.open(oauthUrl, "_blank", "noopener,noreferrer")
        if (!popup) {
          setShowInAppGuide(true)
          toast({
            title: t("auth.inapp_notice_title"),
            description: t("auth.open_external_failed"),
            variant: "destructive",
          })
        }
        return
      }

      window.location.assign(oauthUrl)
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
  // handleSignIn: OAuth URL을 받아 환경에 따라 새 창 열기 또는 리디렉션을 수행한다.

  const handleOpenExternal = () => {
    if (!latestOauthUrl) {
      toast({
        title: t("auth.inapp_notice_title"),
        description: t("auth.oauth_url_missing"),
        variant: "destructive",
      })
      return
    }
    const popup = window.open(latestOauthUrl, "_blank", "noopener,noreferrer")
    if (!popup) {
      toast({
        title: t("auth.inapp_notice_title"),
        description: t("auth.open_external_failed"),
        variant: "destructive",
      })
    }
  }
  // handleOpenExternal: 인앱 브라우저에서 외부 창 열기를 재시도한다.

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
          {showInAppGuide ? (
            <Alert variant="destructive">
              <AlertTitle>{t("auth.inapp_notice_title")}</AlertTitle>
              <AlertDescription>
                <p>{t("auth.inapp_notice")}</p>
                <Button
                  type="button"
                  size="sm"
                  className="mt-3"
                  onClick={handleOpenExternal}
                  disabled={isSigningIn || !latestOauthUrl}
                >
                  {t("auth.open_external")}
                </Button>
              </AlertDescription>
            </Alert>
          ) : null}

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
// SignInPage: Google OAuth 로그인과 인앱 안내 UI를 제공하는 페이지 컴포넌트다. (사용: /signin 경로)
