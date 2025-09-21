// 경로: app/settings/page.tsx
// 역할: 사용자 기본 설정 및 이용권 현황 관리
// 의존관계: hooks/use-auth, app/api/settings/profile, app/api/entitlements/me, app/api/payments/*
// 포함 함수: SettingsPage()
"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AppLayout } from "@/components/layout/app-layout"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { LevelHistory } from "@/components/settings/level-history"
import { useAuth } from "@/hooks/use-auth"
import { useTranslation } from "@/lib/i18n"
import { useToast } from "@/hooks/use-toast"
import { SettingsIcon, User, LogOut, CreditCard } from "lucide-react"

type MinimalSettings = { display_name: string; language: "ko" | "ja" }

type EntitlementInfo = {
  status: "free" | "pro" | "expired"
  pro_until: string | null
  can_cancel: boolean
  cancel_deadline: string | null
  payment_id: string | null
}

export default function SettingsPage() {
  const router = useRouter()
  const { user, signOut, updateUser } = useAuth()
  const { t } = useTranslation()
  const { toast } = useToast()

  const [saving, setSaving] = useState(false)
  const [settings, setSettings] = useState<MinimalSettings>({ display_name: user?.name || "", language: "ko" })
  const [entitlement, setEntitlement] = useState<EntitlementInfo | null>(null)
  const [entitlementLoading, setEntitlementLoading] = useState(true)
  const [phone, setPhone] = useState("")
  const [processingPayment, setProcessingPayment] = useState(false)
  const [canceling, setCanceling] = useState(false)

  const loadEntitlement = async () => {
    setEntitlementLoading(true)
    try {
      const res = await fetch("/api/entitlements/me", { cache: "no-store" })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      setEntitlement(json)
    } catch (err: any) {
      console.error(err)
      toast({ title: "이용권 정보를 불러오지 못했습니다.", description: err?.message ?? "잠시 후 다시 시도하세요.", variant: "destructive" })
    } finally {
      setEntitlementLoading(false)
    }
  }

  useEffect(() => {
    loadEntitlement()
  }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch("/api/settings/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ display_name: settings.display_name }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      updateUser({ name: settings.display_name })
      toast({ title: t("settings.saved"), description: "설정이 저장되었습니다." })
    } catch (err: any) {
      toast({ title: "저장 실패", description: err?.message ?? "잠시 후 다시 시도하세요.", variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  const redirectHomeAfterSignOut = async () => {
    await signOut()
    router.push("/")
  }

  const startPayment = async () => {
    if (!phone.trim()) {
      toast({ title: "휴대폰 번호를 입력해 주세요.", variant: "destructive" })
      return
    }
    setProcessingPayment(true)
    try {
      const res = await fetch("/api/payments/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product_id: "pass_30d_unlimited", phone }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.error ?? `HTTP ${res.status}`)
      }
      const json = await res.json()
      if (json?.payurl) {
        window.location.href = json.payurl
      } else {
        throw new Error("결제 URL을 받을 수 없습니다.")
      }
    } catch (err: any) {
      toast({ title: "결제 요청에 실패했습니다.", description: err?.message ?? "잠시 후 다시 시도하세요.", variant: "destructive" })
      setProcessingPayment(false)
    }
  }

  const cancelEntitlement = async () => {
    if (!entitlement?.payment_id) return
    if (!confirm("정말 결제를 취소하시겠습니까? 결제 후 3일 이내에만 취소할 수 있습니다.")) return

    setCanceling(true)
    try {
      const res = await fetch("/api/payments/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payment_id: entitlement.payment_id, reason: "사용자 취소" }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok || json?.error) {
        throw new Error(json?.error ?? `HTTP ${res.status}`)
      }
      toast({ title: "결제가 취소되었습니다." })
      await loadEntitlement()
    } catch (err: any) {
      toast({ title: "취소 실패", description: err?.message ?? "잠시 후 다시 시도하세요.", variant: "destructive" })
    } finally {
      setCanceling(false)
    }
  }

  const formatDate = (value?: string | null) => {
    if (!value) return "-"
    try {
      const date = new Date(value)
      return new Intl.DateTimeFormat("ko", { year: "numeric", month: "2-digit", day: "2-digit" }).format(date)
    } catch {
      return "-"
    }
  }

  return (
    <ProtectedRoute>
      <AppLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <SettingsIcon className="h-8 w-8" />
              {t("settings.title")}
            </h1>
            <p className="text-muted-foreground">필수 정보와 이용권 현황을 확인하세요.</p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" /> 이용권 현황
              </CardTitle>
              <CardDescription>무료 이용과 30일 무제한 이용권을 간편하게 관리하세요.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {entitlementLoading ? (
                <p className="text-sm text-muted-foreground">이용권 정보를 불러오는 중...</p>
              ) : entitlement?.status === "pro" ? (
                <div className="space-y-3">
                  <div className="text-sm">
                    <p className="font-semibold">무제한 학습 이용권이 활성화되었습니다.</p>
                    <p className="text-muted-foreground">만료일: {formatDate(entitlement.pro_until)}</p>
                  </div>
                  {entitlement.can_cancel ? (
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-sm text-muted-foreground">
                        결제 후 3일 이내 취소 가능합니다. 취소 가능 기한: {formatDate(entitlement.cancel_deadline)}
                      </p>
                      <Button variant="outline" onClick={cancelEntitlement} disabled={canceling}>
                        {canceling ? "취소 중..." : "결제 취소"}
                      </Button>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">결제 후 3일이 지나 취소할 수 없습니다.</p>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="text-sm">
                    <p className="font-semibold">무료 이용 중입니다.</p>
                    <p className="text-muted-foreground">매일 한 번 무료 학습을 사용할 수 있습니다.</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">결제에 사용할 휴대폰 번호</Label>
                    <Input
                      id="phone"
                      inputMode="tel"
                      placeholder="예: 01012345678"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                    <Button onClick={startPayment} disabled={processingPayment} className="w-full sm:w-auto">
                      {processingPayment ? "결제 페이지 이동 중..." : "무제한 학습 이용권 구매하기"}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" /> 기본 정보
                </CardTitle>
                <CardDescription>표시 이름과 표시 언어를 관리합니다.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="display-name">{t("settings.display_name")}</Label>
                  <Input
                    id="display-name"
                    value={settings.display_name}
                    onChange={(e) => setSettings((s) => ({ ...s, display_name: e.target.value }))}
                    placeholder="표시 이름"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="language">표시 언어</Label>
                  <Select
                    value={settings.language}
                    onValueChange={(v: any) => setSettings((s) => ({ ...s, language: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ko">한국어</SelectItem>
                      <SelectItem value="ja" disabled>일본어(준비중)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex justify-between pt-2">
                  <Button variant="outline" onClick={redirectHomeAfterSignOut}>
                    <LogOut className="mr-2 h-4 w-4" /> 로그아웃
                  </Button>
                  <Button onClick={handleSave} disabled={saving}>
                    {saving ? "저장 중.." : t("common.save")}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          <LevelHistory />
        </div>
      </AppLayout>
    </ProtectedRoute>
  )
}
// SettingsPage: 사용자 기본 설정과 이용권 현황을 관리한다.

// 사용법: /settings 경로에서 접근한다.