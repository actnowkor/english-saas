// app/api/health/route.ts
// 역할: 서버에서만 읽을 수 있는 환경변수(SUPABASE_SERVICE_ROLE_KEY)가
// 존재하는지 'ok' / 'missing' 텍스트로만 응답합니다.

export const runtime = 'nodejs'; // 서버 런타임에서 실행 (process.env 사용 가능)

export async function GET() {
  const hasKey = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);

  // 브라우저 캐시 방지용 헤더 (선택)
  const headers = {
    'content-type': 'text/plain; charset=utf-8',
    'cache-control': 'no-store',
  };

  // 절대 키 값은 노출하지 않고 상태만 반환
  return new Response(hasKey ? 'ok' : 'missing', { headers });
}
