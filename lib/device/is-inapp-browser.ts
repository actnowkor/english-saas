// 경로: lib/device/is-inapp-browser.ts
// 역할: 주요 인앱 브라우저 환경을 감지하는 클라이언트 유틸리티.
// 의존관계: window.navigator.userAgent
// 포함 함수: isInAppBrowser()

const IN_APP_PATTERNS: RegExp[] = [
  /fbav/i,
  /fban/i,
  /fb_iab/i,
  /fbss/i,
  /instagram/i,
  /kakaotalk/i,
  /kakaostory/i,
  /line\//i,
  /naverapp/i,
  /daumapps/i,
  /;\s?wv/i,
  /inappbrowser/i,
  /kakaowebview/i,
]

export function isInAppBrowser(userAgent?: string): boolean {
  const agent =
    userAgent ?? (typeof navigator !== "undefined" ? navigator.userAgent : "")
  if (!agent) return false

  return IN_APP_PATTERNS.some((pattern) => pattern.test(agent))
}
// isInAppBrowser: 사용자 에이전트 문자열을 검사해 인앱 브라우저 여부를 판별한다. (사용 예: if (isInAppBrowser()) { ... })
