// 경로: hooks/use-dashboard.ts
// 역할: 대시보드 API 응답을 가져와 클라이언트 상태를 유지하는 React 훅
// 의존관계: app/api/dashboard/route.ts
// 포함 함수: useDashboard()

import { useEffect, useState } from "react"
import type { AccessSummary } from "@/lib/payments/access-summary"
import type { LevelStats, LevelUpPolicy } from "@/lib/logic/level-utils"

export type PriorityConcept = {
  key: string
  name: string
  reason: "recent_difficulty" | "spaced" | "next_step"
  score?: number
  trend?: "up" | "down" | "flat"
}

export type DashboardData = {
  level: number
  delta30d: number
  totalSentenceCount: number
  studiedWordCount: number
  calendar: { year: number; month: number; learnedDates: string[] }
  priorityConcepts: PriorityConcept[]
  gates: { weakSessionEnabled: boolean }
  levelMeta: {
    eligibleForNext: boolean
    reason: string
    targetLevel: number
    recentLevelEntry: { level: number; changed_at: string; source: string } | null
    stats: LevelStats | null
    policy: LevelUpPolicy | null
  }
  difficulty: {
    applied: boolean
    reason: string
    applied_mix: Record<string, number> | null
    policy_level: number | null
    recent_correct_rate: number | null
    low_box_concept_count: number | null
  }
  access: AccessSummary
  free_sessions_left: number
  pro_until: string | null
}

type UseDashboardState =
  | { loading: true; error: null; data: null }
  | { loading: false; error: string | null; data: DashboardData | null }

export function useDashboard() {
  const [state, setState] = useState<UseDashboardState>({
    loading: true,
    error: null,
    data: null,
  })

  useEffect(() => {
    let mounted = true

    const fetchData = async () => {
      try {
        const res = await fetch("/api/dashboard", { cache: "no-store" })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const json: DashboardData = await res.json()
        if (!mounted) return
        setState({ loading: false, error: null, data: json })
      } catch (err: any) {
        if (!mounted) return
        setState({
          loading: false,
          error: err?.message ?? "failed",
          data: null,
        })
      }
    }

    fetchData()
    return () => {
      mounted = false
    }
  }, [])

  return state
}
// useDashboard: 대시보드 화면에서 API 상태를 관리한다.
// 사용처: app/dashboard/page.tsx 등 대시보드 관련 컴포넌트.
