// 경로: lib/session-planner.ts
// 역할: 세션 생성 규칙(분기)과 문제 샘플링 로직을 한 곳에 모음
// 의존: Supabase(서버), 테이블: problems, sessions, session_items

import type { SupabaseClient } from "@supabase/supabase-js"

export type SessionType = "standard" | "review_only" | "new_only" | "weakness"

export type SessionPlanInput = {
  requestedType: SessionType
  userLevel: number        // 사용자 레벨(대시보드에 이미 있음)
  builtSentenceCount: number // 사용자가 만든(저장한) 문장 수(대시보드에 이미 있음)
  limit?: number
}

export type SessionPlan = {
  effectiveType: SessionType   // 실제로 적용할 타입(규칙에 의해 강제 변경될 수 있음)
  limit: number                // 몇 문제 낼지
}

export function decidePlan(input: SessionPlanInput): SessionPlan {
  const limit = input.limit ?? 10

  // 규칙 예시: 300 미만이면 standard / review_only / weakness 불가 → 강제 new_only
  const gateLocked = input.builtSentenceCount < 300
  const requested = input.requestedType

  if (gateLocked && requested !== "new_only") {
    return { effectiveType: "new_only", limit }
  }

  // (추후 규칙 확장 지점: userLevel, 최근 오답 개념 등으로 fine-tune)
  return { effectiveType: requested, limit }
}

// ───────── 샘플러들(지금은 new_only만 실제 구현) ─────────

export async function sampleProblemsNewOnly(
  supabase: SupabaseClient,
  input: SessionPlanInput,
  plan: SessionPlan
) {
  // 예) userLevel 근처의 레벨만 우선(간단 필터: level BETWEEN L-1 ~ L+1), 랜덤 N개
  const minL = Math.max(1, input.userLevel - 1)
  const maxL = Math.min(9, input.userLevel + 1)

  const { data, error } = await supabase
    .from("problems")
    .select("id, level, difficulty, source_ko, answer_en, allowed_variants_text")
    .gte("level", minL)
    .lte("level", maxL)
    .order("random")
    .limit(plan.limit)

  if (error || !data) throw new Error("problems 샘플링 실패")
  return data
}

// (미래용) 표준/복습/약점은 함수만 만들어 두고, 지금은 비워둠/미구현 표시
export async function sampleProblemsStandard() {
  // TODO: 최근 풀이/정오답 분포를 반영해 섞어서 뽑기
  return []
}
export async function sampleProblemsReviewOnly() {
  // TODO: 사용자가 풀었던 아이템 중, 잊힐만한 간격/오답 위주로 뽑기
  return []
}
export async function sampleProblemsWeakness() {
  // TODO: 약한 개념 TOP5에서 representative item으로 뽑기
  return []
}
