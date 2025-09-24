// 경로: app/onboarding/page.tsx
// 역할: 온보딩 레벨 선택 UI를 제공하고 완료 시 사용자 상태를 갱신한다.
// 의존관계: @/components/auth/protected-route, @/hooks/use-auth, @/hooks/use-toast, @/lib/i18n
// 포함 함수: OnboardingPage()

"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { useTranslation } from "@/lib/i18n"
import { useToast } from "@/hooks/use-toast"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { useAuth } from "@/hooks/use-auth"

// 온보딩에서 노출하는 레벨 목록 (표시용은 L1~L9, 서버에선 정수 1~9로 변환)
const levels = [
  { value: "L1", label: "L1 - 기초", description: "기본 단어와 간단한 문장" },
  { value: "L2", label: "L2 - 초급", description: "일상 대화 기초" },
  { value: "L3", label: "L3 - 초중급", description: "기본 문법과 표현" },
  { value: "L4", label: "L4 - 중급", description: "복합 문장과 시제" },
  { value: "L5", label: "L5 - 중상급", description: "다양한 표현과 어휘" },
  { value: "L6", label: "L6 - 고급", description: "복잡한 문법 구조" },
  { value: "L7", label: "L7 - 상급", description: "고급 어휘와 표현" },
  { value: "L8", label: "L8 - 최상급", description: "전문적인 영어" },
  { value: "L9", label: "L9 - 원어민", description: "원어민 수준" },
]

// 문자열 "L1"…"L9" 를 서버에서 기대하는 정수 1…9 로 변환
function toIntLevel(level: string): number | null {
  const m = /^L([1-9])$/.exec(level)
  if (!m) return null
  const n = Number(m[1])
  return n >= 1 && n <= 9 ? n : null
}
// toIntLevel: 레벨 문자열을 정수 레벨 값으로 변환한다.

export default function OnboardingPage() {
  const [selectedLevel, setSelectedLevel] = useState<string>("")
  const [isSaving, setIsSaving] = useState(false)
  const { t } = useTranslation()
  const { toast } = useToast()
  const router = useRouter()
  const { updateUser } = useAuth()

  // 저장 처리: 서버 API 호출 후 라우팅
  const handleSave = async () => {
    if (!selectedLevel) return
    setIsSaving(true)

    try {
      // 1) 클라이언트 측에서 한 번 더 가벼운 유효성 체크
      const lvInt = toIntLevel(selectedLevel)
      if (!lvInt) {
        toast({ title: t("onboarding.save_error"), description: "레벨이 올바르지 않습니다.", variant: "destructive" })
        return
      }

      // 2) 서버 API 호출 (쿠키 기반 세션 사용)
      const res = await fetch("/api/onboarding/complete", {
        method: "POST",
        credentials: "include", // 중요: 인증 쿠키 포함
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ level: selectedLevel }),
      })

      // 3) 결과 분기
      if (res.ok) {
        // 최초 성공(200)
        const nowIso = new Date().toISOString()
        toast({
          title: t("onboarding.saved"),
          description: `${selectedLevel} ${t("onboarding.level_set_confirm") ?? "레벨로 설정되었습니다"}`,
        })
        updateUser({
          current_level: lvInt,
          onboarded_at: nowIso,
        })
        router.push("/dashboard")
        return
      }

      if (res.status === 409) {
        // 이미 완료(멱등): 곧바로 대시보드로
        router.push("/dashboard")
        return
      }

      if (res.status === 401) {
        toast({ title: t("onboarding.save_error"), description: "로그인이 필요합니다.", variant: "destructive" })
        return
      }

      // 그 외 예외
      const payload = await res.json().catch(() => null)
      toast({
        title: t("onboarding.save_error"),
        description: payload?.message ?? "저장 중 오류가 발생했습니다.",
        variant: "destructive",
      })
    } catch (e) {
      toast({
        title: t("onboarding.save_error"),
        description: "네트워크 오류가 발생했습니다.",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }
  // handleSave: 온보딩 완료 요청을 보내고 사용자 상태를 갱신한다.

  return (
    <ProtectedRoute>
      <div className="min-h-screen flex items-center justify-center bg-muted/50 p-4">
        <Card className="w-full max-w-2xl">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">{t("onboarding.title")}</CardTitle>
            <CardDescription>{t("onboarding.level_prompt")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <RadioGroup value={selectedLevel} onValueChange={setSelectedLevel}>
              <div className="grid gap-3">
                {levels.map((level) => (
                  <div
                    key={level.value}
                    className="flex items-center space-x-3 rounded-lg border p-4 hover:bg-muted/50"
                  >
                    <RadioGroupItem value={level.value} id={level.value} />
                    <Label htmlFor={level.value} className="flex-1 cursor-pointer">
                      <div className="font-medium">{level.label}</div>
                      <div className="text-sm text-muted-foreground">{level.description}</div>
                    </Label>
                  </div>
                ))}
              </div>
            </RadioGroup>

            <Button onClick={handleSave} disabled={!selectedLevel || isSaving} className="w-full" size="lg">
              {isSaving ? t("common.loading") : t("onboarding.cta_save")}
            </Button>
          </CardContent>
        </Card>
      </div>
    </ProtectedRoute>
  )
}
