// hooks/use-auth.tsx
// 紐⑹쟻: ?대씪?댁뼵???몄쬆 而⑦뀓?ㅽ듃. ?⑤낫???щ?瑜?"DB(users.current_level)" 湲곗??쇰줈 ?먯젙.
// 蹂寃??붿빟:
//  - (以묒슂) 濡쒖뺄?ㅽ넗由ъ? hasCompletedOnboarding ?섏〈 ?쒓굅 ??DB??current_level 湲곕컲 isFirstTime 怨꾩궛
//  - (以묒슂) updateUser媛 current_level 媛깆떊??諛섏쁺(?쒖떆???곹깭?먮쭔; ?ㅼ젣 DB 媛깆떊? API媛 ?대떦)
//  - Supabase ?몄뀡 蹂???? ??긽 users ?뚯씠釉붿뿉???꾨줈??id, current_level, onboarding_at) 議고쉶
//
// 諛곌꼍: 湲곗〈 ?뚯씪? 濡쒖뺄?ㅽ넗由ъ? ?뚮옒洹몃줈 isFirstTime??怨꾩궛?덉뒿?덈떎. ?댁젣 DB ?⑥씪 湲곗??쇰줈 ?듭씪?⑸땲?? :contentReference[oaicite:1]{index=1}

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

// ?깆뿉???ъ슜?섎뒗 ?ъ슜??????쒖떆 ?꾩슜)
interface User {
  id: string
  email: string
  name: string
  role: "user" | "admin"
  image?: string

  // ?⑤낫???덈꺼 愿???쒖떆 ?꾩슜)
  current_level: number | null          // DB users.current_level (1~9 | null)
  onboarding_at: string | null          // DB users.onboarding_at (ISO | null)
  isFirstTime: boolean                  // current_level === null ?몄? ?щ?
}

interface AuthContextType {
  user: User | null
  loading: boolean
  signIn: (email?: string) => Promise<void>
  signOut: () => Promise<void>
  updateUser: (updates: Partial<User>) => void // ?쒖떆 ?꾩슜 ?곹깭 merge
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

/** Supabase auth.user + users ?꾨줈?꾩쓣 ?⑹퀜??App User濡?蹂??*/
function buildAppUser(params: {
  supaUser: NonNullable<Awaited<ReturnType<typeof supabase.auth.getUser>>["data"]["user"]>
  profile: { id: string; display_name?: string | null; current_level: number | null; onboarding_at: string | null } | null
}): User {
  const { supaUser, profile } = params

  // ?대쫫 ?꾨낫(硫뷀??곗씠?????대찓???꾩씠??
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
    // ???⑤낫???щ???DB 湲곗??쇰줈留?    isFirstTime: current_level === null,
  }
}

/** ?꾩옱 濡쒓렇???ъ슜?먯쓽 users ?꾨줈?꾩쓣 ?쎈뒗???놁쑝硫?null) */
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
    // RLS/?ㅽ듃?뚰겕 ?ㅻ쪟 ?깆? ?곸쐞?먯꽌 泥섎━
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

  // 최초 로드 + 세션 변화를 처리
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

  // Google OAuth 濡쒓렇??  const signIn = async (_email = "") => {
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

  // 濡쒓렇?꾩썐
  const signOut = async () => {
    setLoading(true)
    try {
      await supabase.auth.signOut().catch(() => {})
    } finally {
      setUser(null)
      setLoading(false)
    }
  }

  // ?쒖떆 ?꾩슜 ?곹깭 蹂묓빀(?ㅼ젣 DB 蹂寃쎌? ?쒕쾭 API媛 ?섑뻾)
  const updateUser = (updates: Partial<User>) => {
    if (!user) return
    const merged = { ...user, ...updates }

    // current_level 媛믪씠 ?ㅼ뼱?ㅻ㈃ isFirstTime???숆린??    if ("current_level" in updates) {
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





