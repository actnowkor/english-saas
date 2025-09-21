// hooks/use-auth.tsx
// 역할: Supabase 인증 정보를 클라이언트 컨텍스트로 제공한다.

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

type UserRole = "user" | "admin"

type User = {
  id: string
  email: string
  name: string
  role: UserRole
  image?: string
  current_level: number | null
  onboarding_at: string | null
  isFirstTime: boolean
}

type AuthContextType = {
  user: User | null
  loading: boolean
  signIn: () => Promise<void>
  signOut: () => Promise<void>
  updateUser: (updates: Partial<User>) => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

function buildAppUser(params: {
  supaUser: NonNullable<Awaited<ReturnType<typeof supabase.auth.getUser>>["data"]["user"]>
  profile: { id: string; display_name?: string | null; current_level: number | null; onboarding_at: string | null } | null
}): User {
  const { supaUser, profile } = params
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
    isFirstTime: current_level === null,
  }
}

async function fetchOwnProfile() {
  const { data: auth } = await supabase.auth.getUser()
  const uid = auth?.user?.id
  if (!uid) return null

  const { data, error } = await supabase
    .from("users")
    .select("id, display_name, current_level, onboarding_at")
    .eq("id", uid)
    .limit(1)
    .maybeSingle()

  if (error || !data) {
    return null
  }

  return {
    id: data.id,
    display_name: data.display_name ?? null,
    current_level: (data as any).current_level ?? null,
    onboarding_at: (data as any).onboarding_at ?? null,
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  // 초기 부트스트랩 + 세션 변화 감지
  useEffect(() => {
    const bootstrap = async () => {
      setLoading(true)
      try {
        const { data, error } = await supabase.auth.getUser()
        if (error || !data?.user) {
          setUser(null)
          return
        }
        const profile = await fetchOwnProfile()
        const appUser = buildAppUser({ supaUser: data.user, profile })
        setUser(appUser)
      } finally {
        setLoading(false)
      }
    }

    void bootstrap()

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!session?.user) {
        setUser(null)
        return
      }
      const profile = await fetchOwnProfile()
      const appUser = buildAppUser({ supaUser: session.user, profile })
      setUser(appUser)
    })

    return () => {
      sub?.subscription?.unsubscribe?.()
    }
  }, [])

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

  const signOut = async () => {
    setLoading(true)
    try {
      await supabase.auth.signOut().catch(() => {})
    } finally {
      setUser(null)
      setLoading(false)
    }
  }

  const updateUser = (updates: Partial<User>) => {
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

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider")
  return ctx
}
