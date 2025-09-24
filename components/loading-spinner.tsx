// 경로: components/loading-spinner.tsx
// 역할: 전역 로딩 스피너 및 상태 메시지 컴포넌트를 제공한다.
// 의존관계: @/lib/utils, lucide-react/Loader2
// 포함 함수: LoadingSpinner(), LoadingState(), FullPageLoader()

import type { ReactNode } from "react"
import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg"
  className?: string
}

interface LoadingStateProps {
  title?: string
  message?: string
  hint?: string
  size?: "default" | "compact"
  align?: "center" | "start"
  className?: string
  action?: ReactNode
}

interface FullPageLoaderProps {
  title?: string
  message?: string
  hint?: string
}

export function LoadingSpinner({ size = "md", className }: LoadingSpinnerProps) {
  const sizeClasses: Record<"sm" | "md" | "lg", string> = {
    sm: "h-4 w-4",
    md: "h-6 w-6",
    lg: "h-8 w-8",
  }

  return <Loader2 className={cn("animate-spin text-primary", sizeClasses[size], className)} aria-hidden="true" />
}
// LoadingSpinner: 기본 회전 애니메이션이 적용된 아이콘을 렌더링한다.
// 사용법: 버튼 내부나 로딩 상태를 나타낼 작은 영역에 배치한다.

export function LoadingState({
  title = "잠시만요!",
  message = "여러분의 정보를 가져오는 중이에요.",
  hint,
  size = "default",
  align = "center",
  className,
  action,
}: LoadingStateProps) {
  const containerPadding = size === "compact" ? "py-6" : "py-12"
  const minHeight = size === "compact" ? "min-h-[140px]" : "min-h-[220px]"
  const alignment = align === "center" ? "items-center text-center" : "items-start text-left"
  const spinnerPlacement = align === "center" ? "self-center" : "self-start"

  return (
    <div
      className={cn(
        "flex w-full flex-col justify-center gap-4",
        containerPadding,
        minHeight,
        alignment,
        className
      )}
    >
      <div className={cn("relative flex h-16 w-16 items-center justify-center", spinnerPlacement)}>
        <div className="absolute h-16 w-16 rounded-full bg-primary/10 blur-sm" aria-hidden="true" />
        <div className="absolute h-16 w-16 rounded-full border border-primary/30 animate-ping" aria-hidden="true" />
        <LoadingSpinner size="lg" />
      </div>

      <div className="space-y-1">
        <p className="text-lg font-semibold">{title}</p>
        <p className="text-sm text-muted-foreground">{message}</p>
      </div>

      {hint ? <p className="text-xs text-muted-foreground/80">{hint}</p> : null}
      {action}
    </div>
  )
}
// LoadingState: 스피너와 안내 문구를 함께 출력해 사용자를 안심시킨다.
// 사용법: 페이지 또는 카드 영역에서 데이터 로딩 중일 때 보여준다.

export function FullPageLoader({
  title = "잠시만요!",
  message = "여러분의 정보를 가져오는 중이에요.",
  hint = "필요한 학습 데이터를 정리하고 있어요.",
}: FullPageLoaderProps) {
  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <LoadingState title={title} message={message} hint={hint} className="max-w-md" />
    </div>
  )
}
// FullPageLoader: 전역 Suspense fallback 등 전체 화면 로딩 상태를 표시한다.
// 사용법: 레이아웃이나 페이지 전환 시 최상위 로딩 UI로 활용한다.

