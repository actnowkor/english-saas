// 경로: lib/logic/level-utils.ts
// 역할: 레벨 평가 RPC 호출 및 전략 메타 해석 유틸 모음
// 의존관계: lib/supabase/server-client.ts, Supabase RPC evaluate_user_level_progress/auto_level_up
// 포함 함수: evaluateUserLevelProgress(), autoLevelUp(), extractAdjustmentFromStrategy(), shouldLevelUp()

import type { SupabaseServerClient } from "@/lib/supabase/server-client"

export type LevelStats = {
  recent_session_id: string | null
  recent_session_started_at: string | null
  recent_session_ended_at: string | null
  recent_attempts: number
  recent_correct_attempts: number
  recent_correct_rate: number
  total_attempts: number
  stable_concept_count: number
  stable_concept_ratio: number
  low_box_concept_count: number
}
export type LevelUpPolicy = {
  level: number
  min_total_attempts: number | null
  min_correct_rate: number | null
  min_box_level_ratio: number | null
}
// LevelUpPolicy: 레벨 승급 정책 임계값 정보를 담는다.

export type LevelEvaluation = {
  eligible: boolean
  reason: string
  current_level: number
  target_level: number
  stats: LevelStats | null
}

export type AutoLevelUpResult = {
  leveled_up: boolean
  new_level?: number
  source?: string
  reason?: string
}

export type AdjustmentCondition = {
  recent_correct_rate_below: number
  low_box_concepts_over: number
}

export type StrategyAdjustment = {
  applied: boolean
  reason: string
  policy_level?: number | null
  recent_correct_rate?: number | null
  low_box_concept_count?: number | null
  applied_mix?: Record<string, number> | null
}

export async function evaluateUserLevelProgress(
  client: SupabaseServerClient,
  userId: string
): Promise<LevelEvaluation> {
  const { data, error } = await client.rpc("evaluate_user_level_progress", { p_user_id: userId })
  if (error) {
    throw error
  }
  const stats: LevelStats | null = data?.stats ?? null
  return {
    eligible: Boolean(data?.eligible),
    reason: String(data?.reason ?? ""),
    current_level: Number(data?.current_level ?? 0),
    target_level: Number(data?.target_level ?? 0),
    stats,
  }
}
// evaluateUserLevelProgress: SQL 함수 평가 결과를 가져와 가공한다.

export async function autoLevelUp(
  client: SupabaseServerClient,
  userId: string,
  source?: string
): Promise<AutoLevelUpResult> {
  const { data, error } = await client.rpc("auto_level_up", { p_user_id: userId, p_source: source ?? null })
  if (error) {
    throw error
  }
  return {
    leveled_up: Boolean(data?.leveled_up),
    new_level: data?.new_level != null ? Number(data.new_level) : undefined,
    source: data?.source ?? source,
    reason: data?.reason ?? undefined,
  }
}
// autoLevelUp: 조건 충족 시 레벨을 올리고 결과를 반환한다.

export function extractAdjustmentFromStrategy(strategy: any): StrategyAdjustment {
  const adj = strategy?.adjustment ?? {}
  const mix = strategy?.applied_level_mix ?? strategy?.level_mix ?? null
  const normalizedMix: Record<string, number> | null = mix
    ? Object.fromEntries(
        Object.entries(mix as Record<string, number | string>).map(([level, weight]) => [
          level,
          Number(weight),
        ])
      )
    : null
  const rawPolicy = adj?.policy_level
  const rawRecentRate = adj?.recent_correct_rate
  const rawLowBox = adj?.low_box_concept_count
  const policyLevel =
    typeof rawPolicy === "number"
      ? rawPolicy
      : rawPolicy != null && !Number.isNaN(Number(rawPolicy))
      ? Number(rawPolicy)
      : null
  const recentRate =
    typeof rawRecentRate === "number"
      ? rawRecentRate
      : rawRecentRate != null && !Number.isNaN(Number(rawRecentRate))
      ? Number(rawRecentRate)
      : null
  const lowBox =
    typeof rawLowBox === "number"
      ? rawLowBox
      : rawLowBox != null && !Number.isNaN(Number(rawLowBox))
      ? Number(rawLowBox)
      : null
  return {
    applied: Boolean(adj?.applied),
    reason: typeof adj?.reason === "string" ? adj.reason : "",
    policy_level: policyLevel,
    recent_correct_rate: recentRate,
    low_box_concept_count: lowBox,
    applied_mix: normalizedMix,
  }
}
// extractAdjustmentFromStrategy: 세션 전략 JSON에서 조정 정보를 뽑는다.

export function shouldLevelUp(stats: LevelStats, policy: {
  min_total_attempts: number
  min_correct_rate: number
  min_box_level_ratio: number
}): boolean {
  if (stats.total_attempts < policy.min_total_attempts) return false
  if (stats.recent_correct_rate < policy.min_correct_rate) return false
  if (stats.stable_concept_ratio < policy.min_box_level_ratio) return false
  return true
}
// shouldLevelUp: 정책 기준을 만족하는지 여부를 판정한다.

export function shouldAdjustDifficulty(
  stats: Pick<LevelStats, "recent_correct_rate" | "low_box_concept_count">,
  condition: AdjustmentCondition
): boolean {
  return (
    stats.recent_correct_rate < condition.recent_correct_rate_below &&
    stats.low_box_concept_count >= condition.low_box_concepts_over
  )
}
// shouldAdjustDifficulty: 난이도 조정 정책 조건 충족 여부를 계산한다.

// 사용법: 서버 API 혹은 페이지 로직에서 Supabase 클라이언트를 전달해 호출한다.

