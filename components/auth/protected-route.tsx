// 경로: components/auth/protected-route.tsx
// 역할: 인증 상태에 따라 접근 권한을 제어하는 보호 라우트를 제공한다.
// 의존관계: @/hooks/use-auth, next/navigation, @/components/ui/skeleton
// 포함 함수: ProtectedRoute(), checkNeedsOnboarding()
"use client"

import type React from "react"

import type { AppUser } from "@/lib/auth/app-user"
import { useAuth } from "@/hooks/use-auth"
import { usePathname, useRouter } from "next/navigation"
import { useEffect, useMemo } from "react"
import { Skeleton } from "@/components/ui/skeleton"

function checkNeedsOnboarding(targetUser: AppUser): boolean {
  const onboardedAt =
    (targetUser as AppUser & { onboarded_at?: string | null }).onboarded_at ??
    targetUser.onboarding_at ??
    null

  return targetUser.current_level === null || !onboardedAt
}
// checkNeedsOnboarding: 사용자 온보딩 필요 여부를 계산한다.

interface ProtectedRouteProps {
  children: React.ReactNode
  requireAdmin?: boolean
}

export function ProtectedRoute({ children, requireAdmin = false }: ProtectedRouteProps) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  const needsOnboarding = useMemo(() => {
    if (!user) return false
    return checkNeedsOnboarding(user)
  }, [user])

  const isOnboardingExceptionPath = useMemo(() => {
    if (!pathname) return false
    return pathname.startsWith("/onboarding") || pathname.startsWith("/auth")
  }, [pathname])

  useEffect(() => {
    if (loading) return

    if (!user) {
      if (typeof window !== "undefined") {
        const redirectPath = sessionStorage.getItem("redirectAfterSignOut")
        if (redirectPath) {
          sessionStorage.removeItem("redirectAfterSignOut")
          router.replace(redirectPath)
          return
        }
      }

      router.push("/signin")
      return
    }

    if (requireAdmin && user.role !== "admin") {
      router.push("/403")
      return
    }

    const needsOnboarding = checkNeedsOnboarding(user)

    // 온보딩 리디렉션 예외: 온보딩 진행 화면(/onboarding)과 인증/로그아웃 경로(/auth/*)
    if (needsOnboarding && !isOnboardingExceptionPath) {
      router.replace("/onboarding")
    }
  }, [user, loading, requireAdmin, router, pathname, isOnboardingExceptionPath])

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  if (requireAdmin && user.role !== "admin") {
    return null
  }

  if (needsOnboarding && !isOnboardingExceptionPath) {
    return null
  }

  return <>{children}</>
}
// ProtectedRoute: 사용자 권한을 확인해 허용되지 않는 페이지 접근을 차단한다.
