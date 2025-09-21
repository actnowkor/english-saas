// 경로: env.d.ts
// 역할: 프로젝트에서 사용하는 환경 변수 타입 정의
// 의존관계: 없음
// 포함 타입: NodeJS.ProcessEnv

declare namespace NodeJS {
  interface ProcessEnv {
    NEXT_PUBLIC_SUPABASE_URL: string
    NEXT_PUBLIC_SUPABASE_ANON_KEY: string
    SUPABASE_SERVICE_ROLE_KEY: string
    PAYAPP_USER_ID: string
    PAYAPP_LINKKEY: string
    PAYAPP_LINKVAL: string
    PAYAPP_FEEDBACK_URL: string
    PAYAPP_API_BASE?: string
    PAYAPP_RETURN_URL?: string
  }
}