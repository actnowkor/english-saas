// 경로: hooks/use-auth.tsx
// 역할: 클라이언트 전역 인증 상태를 관리하고 Supabase 세션을 동기화한다.
// 의존관계: @/lib/supabase/browser-client, @/lib/auth/app-user
// 포함 함수: AuthProvider(), useAuth()

"use client"

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import { supabase } from "@/lib/supabase/browser-client"
import { buildAppUser, type AppUser, type ProfileRow } from "@/lib/auth/app-user"

type AuthContextType = {
  user: AppUser | null
  loading: boolean
  signIn: () => Promise<void>
  signOut: () => Promise<boolean>
  updateUser: (updates: Partial<AppUser>) => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

async function fetchOwnProfile(): Promise<ProfileRow | null> {
  const { data: auth } = await supabase.auth.getUser()
  const uid = auth?.user?.id
  if (!uid) return null

  const { data, error } = await supabase
    .from("users")
    .select("id, display_name, current_level, onboarding_at")
    .eq("id", uid)
    .limit(1)
    .maybeSingle()

  if (error) {
    console.warn("[useAuth] failed to fetch profile", error.message)
    return { id: uid, display_name: null, current_level: null, onboarding_at: null }
  }

  if (!data) {
    return { id: uid, display_name: null, current_level: null, onboarding_at: null }
  }

  return data as ProfileRow
}
// fetchOwnProfile: 현재 로그인 사용자의 프로필 정보를 가져온다.

export function AuthProvider({
  children,
  initialUser = null,
}: {
  children: ReactNode
  initialUser?: AppUser | null
}) {
  const [user, setUser] = useState<AppUser | null>(initialUser)
  const [loading, setLoading] = useState<boolean>(initialUser ? false : true)
  const hasInitialUser = initialUser !== null

  useEffect(() => {
    let mounted = true

    const bootstrap = async () => {
      if (hasInitialUser) {
        setLoading(false)
        return
      }

      setLoading(true)
      try {
        const { data, error } = await supabase.auth.getSession()
        if (!mounted) return
        if (error || !data?.session?.user) {
          setUser(null)
          return
        }
        const profile = await fetchOwnProfile()
        const appUser = buildAppUser({ supaUser: data.session.user, profile })
        if (!mounted) return
        setUser(appUser)
      } finally {
        if (mounted) setLoading(false)
      }
    }

    void bootstrap()

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return
      if (!session?.user) {
        setUser(null)
        setLoading(false)
        return
      }
      const profile = await fetchOwnProfile()
      const appUser = buildAppUser({ supaUser: session.user, profile })
      setUser(appUser)
      setLoading(false)
    })

    return () => {
      mounted = false
      sub?.subscription?.unsubscribe?.()
    }
  }, [hasInitialUser])

  const signIn = async () => {
    setLoading(true)
    try {
      const origin = typeof window !== "undefined" ? window.location.origin : ""
      const redirectTo = origin ? `${origin}/auth/callback?redirectedFrom=/dashboard` : undefined
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo },
      })
      if (error) throw error
    } finally {
      setLoading(false)
    }
  }

  const signOut = async (): Promise<boolean> => {
    setLoading(true)
    try {
      if (typeof window !== "undefined") {
        sessionStorage.setItem("redirectAfterSignOut", "/")
      }
      const { error } = await supabase.auth.signOut()
      if (error) {
        console.warn("[useAuth] 로그아웃에 실패했습니다.", error.message)
        return false
      }
      setUser(null)
      return true
    } catch (err: any) {
      console.warn("[useAuth] 로그아웃 처리 중 예외가 발생했습니다.", err?.message ?? err)
      throw err
    } finally {
      setLoading(false)
    }
  }
  // signOut: Supabase 로그아웃 요청을 보내고 성공 여부를 반환한다.

  const updateUser = (updates: Partial<AppUser>) => {
    if (!user) return
    const merged = { ...user, ...updates }
    if ("current_level" in updates) {
      merged.isFirstTime = (updates.current_level ?? null) === null
    }
    setUser(merged)
  }

  const value = useMemo<AuthContextType>(
    () => ({
      user,
      loading,
      signIn,
      signOut,
      updateUser,
    }),
    [user, loading]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
// AuthProvider: 초기 사용자 상태를 포함해 전역 인증 컨텍스트를 제공한다.

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider")
  return ctx
}
// useAuth: 인증 컨텍스트를 손쉽게 접근하기 위한 훅이다.

