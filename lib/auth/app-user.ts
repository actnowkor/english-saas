// 경로: lib/auth/app-user.ts
// 역할: Supabase 인증 사용자와 프로필 정보를 앱 공용 사용자 모델로 변환한다.
// 의존관계: @supabase/supabase-js
// 포함 함수: buildAppUser()

import type { User as SupabaseUser } from "@supabase/supabase-js"

export type AppUserRole = "user" | "admin"

export type AppUser = {
  id: string
  email: string
  name: string
  role: AppUserRole
  image?: string
  current_level: number | null
  onboarded_at: string | null
  isFirstTime: boolean
}

export type ProfileRow = {
  id: string
  display_name?: string | null
  current_level?: number | null
  onboarded_at?: string | null
}

export function buildAppUser(params: {
  supaUser: SupabaseUser
  profile: ProfileRow | null
}): AppUser {
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
  const currentLevel = profile?.current_level ?? null
  const onboardedAt = profile?.onboarded_at ?? null
  const isFirstTime = currentLevel === null || !onboardedAt

  return {
    id: supaUser.id,
    email: supaUser.email ?? "",
    name: preferredName,
    role: "user",
    image: avatar,
    current_level: currentLevel,
    onboarded_at: onboardedAt,
    isFirstTime,
  }
}
// buildAppUser: Supabase 사용자 정보를 앱 공용 사용자 모델로 매핑한다.

