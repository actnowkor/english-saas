// 경로: components/layout/header.tsx
// 역할: 앱 상단 헤더를 렌더링하고 학습/계정 관련 액션을 제공
// 의존관계: hooks/use-auth, hooks/use-sidebar, components/ui/*, app/api/entitlements/me
// 포함 함수: Header()

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
// formatBadgeDate: 이용권 만료일을 YYYY.MM.DD 문자열로 정리한다.

function resolveAccessBadge(access: AccessSummary | null): AccessBadge | null {
  if (!access) return null
  if (access.status === "pro") {
    return { label: `무제한 이용권 ~${formatBadgeDate(access.pro_until)}`, variant: "default" }
  }
  const limit = Math.max(1, Number(access.free_sessions_limit ?? 1))
  const left = Math.max(0, Number(access.free_sessions_left ?? 0))
  const label = `무료 ${left}/${limit}`
  const variant: AccessBadge["variant"] = left > 0 ? "secondary" : "destructive"
  return { label, variant }
}
// resolveAccessBadge: 현재 이용권 상태에 맞는 배지 텍스트와 색상을 계산한다.

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
// Header: 대시보드 전역 헤더를 렌더링하고 이용권 배지를 노출한다.
// 사용처: components/layout/app-layout.tsx에서 공통 레이아웃으로 사용된다.
