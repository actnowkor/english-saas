// 경로: lib/supabase/service-client.ts
// 역할: 서버 환경에서 서비스 롤 키로 Supabase 클라이언트를 생성
// 의존관계: @supabase/supabase-js
// 포함 함수: createServiceClient()

import { createClient as createSupabaseClient } from "@supabase/supabase-js"

if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  throw new Error("NEXT_PUBLIC_SUPABASE_URL 환경 변수가 설정되어 있지 않습니다.")
}

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("SUPABASE_SERVICE_ROLE_KEY 환경 변수가 설정되어 있지 않습니다.")
}

export function createServiceClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { persistSession: false },
    }
  )
}

export type SupabaseServiceClient = ReturnType<typeof createServiceClient>