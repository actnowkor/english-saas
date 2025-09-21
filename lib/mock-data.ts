// 경로: lib/mock-data.ts
// 역할: 학습/관리 화면에서 사용할 목업 타입 정의와 유틸리티 제공
// 의존관계: 없음
// 포함 함수: calculateSessionResult(), buildMockSession()

export type SessionType = "standard" | "review_only" | "new_only" | "weakness"

export interface SessionItemSnapshot {
  item_id: string
  level: number
  difficulty: number
  concept_key?: string | null
  source_ko: string
  answer_en: string
  allowed_variants_text: string[]
  near_misses_text: string[]
}

export interface SessionItem {
  snapshot: SessionItemSnapshot
}

export interface Session {
  session_id: string
  type: SessionType
  origin: "dashboard" | "history" | "admin"
  concept_key: string | null
  created_at: string
  items: SessionItem[]
}

export interface Attempt {
  attempt_id: string
  session_id: string
  item_id: string
  answer_raw: string
  latency_ms: number
  mode: "learn"
}

export type GradeLabel = "correct" | "variant" | "near_miss" | "wrong"
export interface Grade {
  attempt_id: string
  label: GradeLabel
  feedback_short?: string
}

export interface WeakConceptStat {
  concept_key: string
  name: string
  error_count: number
}

export interface SessionResult {
  total_items: number
  correct_items: number
  correct_rate: number
  time_spent_sec: number
  weak_concepts: WeakConceptStat[]
}

export function calculateSessionResult(session: Session, attempts: Attempt[], grades: Grade[]): SessionResult {
  const total_items = session.items.length
  const correct_items = grades.filter((g) => g.label === "correct" || g.label === "variant").length
  const correct_rate = Math.round((correct_items / Math.max(1, total_items)) * 100)

  const time_spent_ms = attempts.reduce((acc, attempt) => acc + (attempt.latency_ms || 0), 0)
  const time_spent_sec = Math.round(time_spent_ms / 1000)

  const errorMap = new Map<string, { name: string; cnt: number }>()
  attempts.forEach((attempt, idx) => {
    const grade = grades[idx]
    const item = session.items.find((it) => it.snapshot.item_id === attempt.item_id)
    const concept_key = item?.snapshot.concept_key || "general"
    const name = concept_key === "general" ? "일반" : concept_key

    if (grade && (grade.label === "near_miss" || grade.label === "wrong")) {
      const current = errorMap.get(concept_key) || { name, cnt: 0 }
      current.cnt += 1
      errorMap.set(concept_key, current)
    }
  })

  const weak_concepts: WeakConceptStat[] = [...errorMap.entries()]
    .map(([concept_key, value]) => ({ concept_key, name: value.name, error_count: value.cnt }))
    .sort((a, b) => b.error_count - a.error_count)
    .slice(0, 5)

  return { total_items, correct_items, correct_rate, time_spent_sec, weak_concepts }
}

export function buildMockSession(params: { type: SessionType; conceptKey?: string | null }): Session {
  const concept = params.conceptKey ?? null
  const level = 1
  const difficulties = [2, 3, 3, 4, 2, 3, 4, 2, 3, 4]

  const items: SessionItem[] = Array.from({ length: 10 }).map((_, index) => ({
    snapshot: {
      item_id: `${concept ?? "general"}_${index + 1}`,
      level,
      difficulty: difficulties[index] ?? 3,
      concept_key: concept,
      source_ko: `예시 문장을 영어로 번역해 보세요 (${index + 1})`,
      answer_en: "I have a meeting at 3.",
      allowed_variants_text: ["I have a meeting at three", "I've got a meeting at 3"],
      near_misses_text: ["I have meeting at 3", "I have a meeting on 3"],
    },
  }))

  return {
    session_id: `sess_${Date.now()}`,
    type: params.type,
    origin: "dashboard",
    concept_key: concept,
    created_at: new Date().toISOString(),
    items,
  }
}