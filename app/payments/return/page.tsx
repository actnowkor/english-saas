// 경로: app/payments/return/page.tsx
// 역할: PayApp 결제 완료 후 사용자 안내 및 설정 페이지로 이동 처리
// 의존관계: next/navigation
// 포함 컴포넌트: PaymentsReturnPage()

"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2 } from "lucide-react"

export default function PaymentsReturnPage() {
  const router = useRouter()

  useEffect(() => {
    const timer = setTimeout(() => {
      router.replace("/settings?purchase=success")
    }, 1500)
    return () => clearTimeout(timer)
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <Card className="max-w-md w-full text-center">
        <CardHeader>
          <CardTitle>결제 결과 확인 중...</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>결제 승인 결과를 확인한 뒤 설정 페이지로 이동합니다.</p>
          <p>잠시만 기다려 주세요.</p>
          <div className="flex justify-center pt-2">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}