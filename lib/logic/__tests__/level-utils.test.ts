// 경로: lib/logic/__tests__/level-utils.test.ts
// 역할: 레벨 판단 유틸 함수 단위 테스트
// 의존관계: lib/logic/level-utils.ts, vitest
// 포함 함수: describe()

import { describe, expect, it } from "vitest"
import { shouldLevelUp } from "@/lib/logic/level-utils"

describe("level-utils", () => {
  it("shouldLevelUp returns true when all thresholds met", () => {
    const stats = {
      recent_session_id: "a",
      recent_session_started_at: null,
      recent_session_ended_at: null,
      recent_attempts: 20,
      recent_correct_attempts: 18,
      recent_correct_rate: 0.9,
      total_attempts: 200,
      stable_concept_count: 50,
      stable_concept_ratio: 0.8,
      low_box_concept_count: 2,
    }
    const policy = { min_total_attempts: 150, min_correct_rate: 0.8, min_box_level_ratio: 0.7 }
    expect(shouldLevelUp(stats, policy)).toBe(true)
  })

  it("shouldLevelUp returns false for low attempts", () => {
    const stats = {
      recent_session_id: "a",
      recent_session_started_at: null,
      recent_session_ended_at: null,
      recent_attempts: 10,
      recent_correct_attempts: 5,
      recent_correct_rate: 0.5,
      total_attempts: 50,
      stable_concept_count: 10,
      stable_concept_ratio: 0.5,
      low_box_concept_count: 6,
    }
    const policy = { min_total_attempts: 100, min_correct_rate: 0.6, min_box_level_ratio: 0.6 }
    expect(shouldLevelUp(stats, policy)).toBe(false)
  })
})

