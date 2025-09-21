// components/auth/protected-route.tsx
"use client"

import type React from "react"

import { useAuth } from "@/hooks/use-auth"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { Skeleton } from "@/components/ui/skeleton"

interface ProtectedRouteProps {
  children: React.ReactNode
  requireAdmin?: boolean
}

export function ProtectedRoute({ children, requireAdmin = false }: ProtectedRouteProps) {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push("/signin")
        return
      }

      if (requireAdmin && user.role !== "admin") {
        router.push("/403")
        return
      }

     // 온보딩 여부는 서버/라우트 레벨에서 처리
     // 여기서는 로그인/권한만 확인
    }
  }, [user, loading, requireAdmin, router])

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

  return <>{children}</>
}
