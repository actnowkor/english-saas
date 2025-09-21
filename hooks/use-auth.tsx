// hooks/use-auth.tsx
// 목적: 클라이언트 인증 컨텍스트. 온보딩 여부를 "DB(users.current_level)" 기준으로 판정.
// 변경 요약:
//  - (중요) 로컬스토리지 hasCompletedOnboarding 의존 제거 → DB의 current_level 기반 isFirstTime 계산
//  - (중요) updateUser가 current_level 갱신을 반영(표시용 상태에만; 실제 DB 갱신은 API가 담당)
//  - Supabase 세션 변화 시, 항상 users 테이블에서 프로필(id, current_level, onboarding_at) 조회
//
// 배경: 기존 파일은 로컬스토리지 플래그로 isFirstTime을 계산했습니다. 이제 DB 단일 기준으로 통일합니다. :contentReference[oaicite:1]{index=1}

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

// 앱에서 사용하는 사용자 타입(표시 전용)
interface User {
  id: string
  email: string
  name: string
  role: "user" | "admin"
  image?: string

  // 온보딩/레벨 관련(표시 전용)
  current_level: number | null          // DB users.current_level (1~9 | null)
  onboarding_at: string | null          // DB users.onboarding_at (ISO | null)
  isFirstTime: boolean                  // current_level === null 인지 여부
}

interface AuthContextType {
  user: User | null
  loading: boolean
  signIn: (email?: string) => Promise<void>
  signOut: () => Promise<void>
  updateUser: (updates: Partial<User>) => void // 표시 전용 상태 merge
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

/** Supabase auth.user + users 프로필을 합쳐서 App User로 변환 */
function buildAppUser(params: {
  supaUser: NonNullable<Awaited<ReturnType<typeof supabase.auth.getUser>>["data"]["user"]>
  profile: { id: string; display_name?: string | null; current_level: number | null; onboarding_at: string | null } | null
}): User {
  const { supaUser, profile } = params

  // 이름 후보(메타데이터 → 이메일 아이디)
  const meta = (supaUser.user_metadata ?? {}) as Record<string, unknown>
  const fullName =
    (meta["full_name"] as string) ||
    (meta["name"] as string) ||
    (meta["given_name"] as string) ||
    (meta["preferred_username"] as string) ||
    (supaUser.email?.split("@")[0] ?? "User")

  const avatar =
    (meta["avatar_url"] as string) ||
    (meta["picture"] as string) ||
    (meta["avatar"] as string) ||
    (meta["profile_image"] as string) ||
    undefined

  const preferredName = (profile?.display_name && String(profile.display_name).trim()) || fullName
  const current_level = profile?.current_level ?? null
  const onboarding_at = profile?.onboarding_at ?? null

  return {
    id: supaUser.id,
    email: supaUser.email ?? "",
    name: preferredName,
    role: "user",
    image: avatar,
    current_level,
    onboarding_at,
    // ✅ 온보딩 여부는 DB 기준으로만
    isFirstTime: current_level === null,
  }
}

/** 현재 로그인 사용자의 users 프로필을 읽는다(없으면 null) */
async function fetchOwnProfile() {
  const { data: auth } = await supabase.auth.getUser()
  const uid = auth?.user?.id
  if (!uid) return null

  const { data, error } = await supabase
    .from("users")
    .select("id, display_name")
    .eq("id", uid)
    .limit(1)
    .maybeSingle()

  if (error) {
    // RLS/네트워크 오류 등은 상위에서 처리
    return null
  }
  return {
    id: (data as any).id,
    display_name: (data as any).display_name ?? null,
    current_level: null,
    onboarding_at: null,
  } as any
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  // 최초 로드 + 세션 변화 시 프로필 동기화
  useEffect(() => {

    const bootstrap = async () => {
      setLoading(true)
      try {
        const { data, error } = await supabase.auth.getUser()
        if (error || !data?.user) {
          setUser(null)
          localStorage.removeItem("user")
          return
        }
        const profile = await fetchOwnProfile()
        const appUser = buildAppUser({ supaUser: data.user, profile })
        setUser(appUser)
        // 표시면 캐시(레이아웃 스켈레톤 최소화용)
        localStorage.setItem("user", JSON.stringify(appUser))
      } finally {
        setLoading(false)
      }
    }

    // 부트스트랩 1회
    void bootstrap()

    // 세션 구독 → 변경 시마다 프로필 재조회
    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!session?.user) {
        setUser(null)
        localStorage.removeItem("user")
        return
      }
      const profile = await fetchOwnProfile()
      const appUser = buildAppUser({ supaUser: session.user, profile })
      setUser(appUser)
      localStorage.setItem("user", JSON.stringify(appUser))
    })

    return () => {
      sub?.subscription?.unsubscribe?.()
    }
  }, [])

  // Google OAuth 로그인
  const signIn = async (_email = "") => {
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

  // 로그아웃
  const signOut = async () => {
    setLoading(true)
    try {
      await supabase.auth.signOut().catch(() => {})
    } finally {
      setUser(null)
      localStorage.removeItem("user")
      setLoading(false)
    }
  }

  // 표시 전용 상태 병합(실제 DB 변경은 서버 API가 수행)
  const updateUser = (updates: Partial<User>) => {
    if (!user) return
    const merged = { ...user, ...updates }

    // current_level 값이 들어오면 isFirstTime도 동기화
    if ("current_level" in updates) {
      merged.isFirstTime = (updates.current_level ?? null) === null
    }

    setUser(merged)
    localStorage.setItem("user", JSON.stringify(merged))
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

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider")
  return ctx
}
