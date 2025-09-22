// 경로: components/layout/header.tsx
// 역할: 상단 내비게이션과 학습/이용권 상태를 보여준다.
// 의존관계: hooks/use-auth, hooks/use-sidebar, components/ui/*, app/api/entitlements/me
// 포함 함수: formatBadgeDate(), resolveAccessBadge(), Header()

"use client"

import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useTranslation } from "@/lib/i18n"
import { LogOut, Settings, Menu, Loader2 } from "lucide-react"
import Link from "next/link"
import { useSidebar } from "@/hooks/use-sidebar"
import { useAuth } from "@/hooks/use-auth"
import { useRouter } from "next/navigation"
import type { AccessSummary } from "@/lib/payments/access-summary"

type AccessBadge = {
  label: string
  variant: "default" | "secondary" | "destructive" | "outline"
}

function formatBadgeDate(value: string | null) {
  if (!value) return "-"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "-"
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}.${month}.${day}`
}
// formatBadgeDate: 이용권 만료일을 YYYY.MM.DD 형식의 문자열로 변환한다.

function resolveAccessBadge(access: AccessSummary | null): AccessBadge | null {
  if (!access) return null
  if (access.reason === "OK_ADMIN") {
    return { label: "관리자", variant: "default" }
  }
  if (access.status === "pro") {
    return { label: `프리미엄 이용권 ~${formatBadgeDate(access.pro_until)}`, variant: "default" }
  }
  // ✅ 서버가 준 값을 최우선으로 사용 (백엔드가 이미 10/10 로직을 보장)
  const limit = Math.max(1, Number(access.free_sessions_limit ?? 10))

  // 1) 서버 left가 오면 그대로 신뢰
  const serverLeft = Number.isFinite(Number(access.free_sessions_left))
    ? Math.max(0, Math.min(limit, Number(access.free_sessions_left)))
    : null

  // 2) 없으면 used_today로 최소한 보정 (limit - used)
  const usedToday = Math.max(0, Number(access.free_sessions_used_today ?? 0))
  const fallbackLeft = Math.max(0, Math.min(limit, limit - usedToday))

  const left = serverLeft !== null ? serverLeft : fallbackLeft

  const label = `무료 ${left}/${limit}`
  return { label, variant: left > 0 ? "secondary" : "destructive" }

}
// resolveAccessBadge: 이용 상태에 따라 표시할 배지 문구와 스타일을 결정한다.

export function Header() {
  const { t } = useTranslation()
  const { toggle } = useSidebar()
  const { user, signOut, loading } = useAuth()
  const router = useRouter()
  const [access, setAccess] = useState<AccessSummary | null>(null)
  const [badgeLoading, setBadgeLoading] = useState(false)

  useEffect(() => {
    let active = true
    if (!user) {
      setAccess(null)
      setBadgeLoading(false)
      return
    }

    setBadgeLoading(true)
    ;(async () => {
      try {
        const res = await fetch("/api/entitlements/me", { cache: "no-store" })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const json = (await res.json()) as AccessSummary
        if (active) setAccess(json)
      } catch (error) {
        if (active) {
          console.warn("[Header] 이용권 정보를 불러오지 못했습니다", (error as any)?.message || error)
          setAccess(null)
        }
      } finally {
        if (active) setBadgeLoading(false)
      }
    })()

    return () => {
      active = false
    }
  }, [user?.id])

  const badgeInfo = useMemo(() => resolveAccessBadge(access), [access])

  return (
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center px-4">
        <Button
          variant="ghost"
          size="sm"
          className="mr-2 lg:hidden"
          onClick={toggle}
          aria-label="Toggle sidebar"
          aria-controls="sidebar"
        >
          <Menu className="h-5 w-5" />
        </Button>

        <div className="mr-4 flex">
          <Link href="/" className="mr-6 flex items-center space-x-2">
            <div className="h-6 w-6 rounded bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">E</span>
            </div>
            <span className="font-bold">EnglishLab</span>
          </Link>
        </div>

        <div className="flex flex-1 items-center justify-between gap-2 md:justify-end">
          <div className="w-full flex-1 md:w-auto md:flex-none">
            <Button asChild className="w-full md:w-auto">
              <Link href="/learn">{t("dashboard.start_learning")}</Link>
            </Button>
          </div>

          {user ? (
            <div className="flex items-center gap-2">
              {badgeLoading ? (
                <Badge variant="outline" className="gap-1 whitespace-nowrap">
                  <Loader2 className="h-3 w-3 animate-spin" /> 확인 중
                </Badge>
              ) : badgeInfo ? (
                <Badge variant={badgeInfo.variant} className="whitespace-nowrap font-medium">
                  {badgeInfo.label}
                </Badge>
              ) : null}
            </div>
          ) : null}

          {loading ? null : user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarImage
                      src={user.image || "/placeholder.svg?height=32&width=32&query=user+avatar"}
                      alt={user.name || "user"}
                    />
                    <AvatarFallback>{user.name?.charAt(0)?.toUpperCase() || "U"}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <div className="flex items-center justify-start gap-2 p-2">
                  <div className="flex flex-col space-y-1 leading-none">
                    <p className="font-medium">{user.name}</p>
                    <p className="w-[200px] truncate text-sm text-muted-foreground">{user.email}</p>
                  </div>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/settings" className="flex items-center">
                    <Settings className="mr-2 h-4 w-4" />
                    <span>{t("settings.title")}</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={async () => {
                    await signOut()
                    router.push("/")
                  }}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>{t("settings.logout")}</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button variant="outline" onClick={() => router.push("/signin")}>Sign in</Button>
          )}
        </div>
      </div>
    </header>
  )
}
// Header: 상단 헤더 UI와 이용권 배지를 렌더링한다.
// 사용 예: <Header />
