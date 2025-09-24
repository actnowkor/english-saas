// 경로: app/api/dashboard/route.ts
// 역할: 대시보드 요약 데이터 집계 및 레벨/난이도 메타 제공
// 의존관계: lib/supabase/server-client.ts, lib/supabase/service-client.ts, lib/logic/level-utils.ts, lib/payments/access-summary.ts
// 포함 함수: GET()

import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server-client"
import { createServiceClient } from "@/lib/supabase/service-client"
import { loadAccessSummary } from "@/lib/payments/access-summary"
import type { AccessSummary } from "@/lib/payments/access-summary"
import { evaluateUserLevelProgress, extractAdjustmentFromStrategy } from "@/lib/logic/level-utils"
import type { LevelStats, LevelUpPolicy } from "@/lib/logic/level-utils"

type PriorityConcept = {
  key: string
  name: string
  reason: "recent_difficulty" | "spaced" | "next_step"
  score?: number
  trend?: "up" | "down" | "flat"
}

type DashboardData = {
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
  }
  access: AccessSummary
  free_sessions_left: number
  pro_until: string | null
}

const EMPTY_ACCESS: AccessSummary = {
  status: "free",
  pro_until: null,
  can_cancel: false,
  cancel_deadline: null,
  payment_id: null,
  free_sessions_used_today: 0,
  free_sessions_left: 1,
  free_sessions_limit: 1,
  can_start: true,
  reason: "OK_WITH_FREE",
}

function normalizePolicyRate(value: unknown) {
  if (value == null) return null
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return null
  return numeric > 1 ? numeric / 100 : numeric
}
// normalizePolicyRate: 정책 백분율 값을 0~1 범위 비율로 변환한다.

function toYMD(d: Date) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const da = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${da}`
}
// toYMD: 날짜를 YYYY-MM-DD 문자열로 변환한다.

export async function GET() {
  const supabase = await createClient()
  const { data: auth } = await supabase.auth.getUser()
  const user = auth?.user
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const service = createServiceClient()
    let accessSummary = EMPTY_ACCESS
    try {
      accessSummary = await loadAccessSummary(service, user.id)
    } catch (accessError) {
      console.warn("[GET /api/dashboard] access summary failed", (accessError as any)?.message || accessError)
    }

    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth() + 1
    const monthStart = new Date(year, month - 1, 1)
    const nextMonthStart = new Date(year, month, 1)

    let level = 1
    let delta30d = 0
    const { data: u } = await supabase
      .from("users")
      .select("current_level")
      .eq("id", user.id)
      .maybeSingle()
    if (typeof u?.current_level === "number") level = u.current_level

    const since = new Date()
    since.setDate(since.getDate() - 30)
    const { data: hist } = await supabase
      .from("user_level_history")
      .select("level, source, changed_at")
      .eq("user_id", user.id)
      .gte("changed_at", since.toISOString())
      .order("changed_at", { ascending: true })
    if (hist && hist.length > 0) {
      const first = hist[0]?.level ?? level
      delta30d = Number(level) - Number(first)
    }

    let totalSentenceCount = 0
    let studiedWordCount = 0
    let learnedDates: string[] = []
    const { data: bundleRows, error: bundleError } = await supabase
      .from("session_bundles")
      .select("summary_json, bundle_seq, started_at")
      .eq("user_id", user.id)
      .order("bundle_seq", { ascending: false })
      .limit(100)
    if (bundleError) {
      console.warn("[GET /api/dashboard] session_bundles load failed", bundleError)
    }
    {
      const bundles = bundleRows ?? []
      const sentenceIds = new Set<string>()
      const wordIds = new Set<string>()
      const phraseIds = new Set<string>()
      const learnedDateSet = new Set<string>()
      for (const bundle of bundles) {
        const summary = (bundle as any)?.summary_json ?? {}
        const items = Array.isArray(summary?.items) ? summary.items : []
        for (const item of items) {
          const id = String(item?.item_id ?? "")
          if (!id) continue
          const typeRaw =
            (item?.type as string | undefined) ??
            (item?.snapshot?.type as string | undefined) ??
            ""
          const type = typeRaw.toLowerCase()
          if (type === "sentence") sentenceIds.add(id)
          else if (type === "word") wordIds.add(id)
          else if (type === "phrase") phraseIds.add(id)
        }
        const calendarDates = summary?.calendar?.dates
        if (Array.isArray(calendarDates)) {
          for (const d of calendarDates) {
            const ds = String(d)
            if (!ds) continue
            const date = new Date(`${ds}T00:00:00Z`)
            if (Number.isNaN(date.getTime())) continue
            if (date >= monthStart && date < nextMonthStart) learnedDateSet.add(ds)
          }
        }
      }
      totalSentenceCount = sentenceIds.size
      studiedWordCount = wordIds.size + phraseIds.size
      learnedDates = Array.from(learnedDateSet).sort()
    }

    let priorityConcepts: PriorityConcept[] = []
    {
      const { data: ucs } = await supabase
        .from("user_concept_status")
        .select("concept_key, wrong_count, correct_count")
        .eq("user_id", user.id)
        .order("wrong_count", { ascending: false })
        .limit(5)
      const keys = Array.from(new Set((ucs ?? []).map((r: any) => String(r.concept_key || "")).filter(Boolean)))
      const nameMap = new Map<string, string>()
      if (keys.length > 0) {
        const tryTables = ["concepts_levels_1_9", "concepts_levels", "concepts"]
        for (const tbl of tryTables) {
          try {
            const { data: cons, error } = await supabase
              .from(tbl)
              .select("concept_key, display_name")
              .in("concept_key", keys)
            if (!error && Array.isArray(cons)) {
              for (const r of cons) {
                const k = String(r.concept_key)
                if (!nameMap.has(k)) nameMap.set(k, String(r.display_name || k))
              }
              if (nameMap.size === keys.length) break
            }
          } catch {}
        }
      }
      priorityConcepts = (ucs ?? []).map((r: any) => ({
        key: r.concept_key || "general",
        name: nameMap.get(String(r.concept_key)) || r.concept_key || "개념",
        reason: Number(r.wrong_count) > Number(r.correct_count) ? "recent_difficulty" : "spaced",
        score: Number(r.wrong_count ?? 0),
        trend: Number(r.wrong_count ?? 0) > Number(r.correct_count ?? 0) ? "up" : "flat",
      }))
    }

    const levelEval = await evaluateUserLevelProgress(supabase, user.id)
    const levelStats: LevelStats | null = levelEval.stats ?? null

    const recentLevelEntry = hist && hist.length > 0 ? hist[hist.length - 1] : null

    const computedTarget = Number(levelEval.target_level || Number(level) + 1) || Number(level) + 1
    let levelPolicy: LevelUpPolicy | null = null
    try {
      const { data: policyRow, error: policyError } = await service
        .from("policy_level_up")
        .select("level,min_total_attempts,min_correct_rate,min_box_level_ratio")
        .eq("level", computedTarget)
        .maybeSingle()
      if (policyError) throw policyError
      if (policyRow) {
        const minCorrectRate = normalizePolicyRate(policyRow.min_correct_rate)
        const minBoxRatio = normalizePolicyRate(policyRow.min_box_level_ratio)
        levelPolicy = {
          level: Number(policyRow.level ?? computedTarget),
          min_total_attempts:
            policyRow.min_total_attempts != null ? Number(policyRow.min_total_attempts) : null,
          min_correct_rate: minCorrectRate,
          min_box_level_ratio: minBoxRatio,
        }
      }
    } catch (policyError) {
      console.warn(
        "[GET /api/dashboard] level policy load failed",
        (policyError as any)?.message || policyError
      )
    }

    const fallbackRecentRate = levelEval.stats?.recent_correct_rate ?? null
    const fallbackLowBox = levelEval.stats?.low_box_concept_count ?? null
    let difficulty = {
      applied: false,
      reason: "최근 조정 기록 없음",
      applied_mix: null as Record<string, number> | null,
      policy_level: null as number | null,
      recent_correct_rate: fallbackRecentRate,
      low_box_concept_count: fallbackLowBox,
    }
    if (levelEval.stats?.recent_session_id) {
      const { data: lastSession } = await supabase
        .from("sessions")
        .select("strategy_json")
        .eq("id", levelEval.stats.recent_session_id)
        .maybeSingle()
      if (lastSession?.strategy_json) {
        const adj = extractAdjustmentFromStrategy(lastSession.strategy_json)
        const rate = adj.recent_correct_rate ?? fallbackRecentRate
        const lowBox = adj.low_box_concept_count ?? fallbackLowBox
        difficulty = {
          applied: adj.applied,
          reason: adj.reason || (adj.applied ? "난이도 조정 적용" : "조정 조건 미충족"),
          applied_mix: adj.applied_mix ?? null,
          policy_level: adj.policy_level ?? null,
          recent_correct_rate: rate,
          low_box_concept_count: lowBox,
        }
      }
    }

    const payload: DashboardData = {
      level: Number(level) || 1,
      delta30d: Number(delta30d) || 0,
      totalSentenceCount,
      studiedWordCount,
      calendar: { year, month, learnedDates },
      priorityConcepts,
      gates: { weakSessionEnabled: true },
      levelMeta: {
        eligibleForNext: levelEval.eligible,
        reason: levelEval.reason,
        targetLevel: levelEval.target_level || computedTarget,
        recentLevelEntry: recentLevelEntry
          ? {
              level: Number(recentLevelEntry.level),
              changed_at: recentLevelEntry.changed_at,
              source: recentLevelEntry.source,
            }
          : null,
        stats: levelStats,
        policy: levelPolicy,
      },
      difficulty,
      access: accessSummary,
      free_sessions_left: accessSummary.free_sessions_left,
      pro_until: accessSummary.pro_until,
    }

    return NextResponse.json(payload)
  } catch (e: any) {
    console.error("[GET /api/dashboard]", e?.message || e)
    const now = new Date()
    return NextResponse.json({
      level: 1,
      delta30d: 0,
      totalSentenceCount: 0,
      studiedWordCount: 0,
      calendar: { year: now.getFullYear(), month: now.getMonth() + 1, learnedDates: [] },
      priorityConcepts: [],
      gates: { weakSessionEnabled: true },
      levelMeta: {
        eligibleForNext: false,
        reason: "데이터를 불러오지 못했습니다.",
        targetLevel: 0,
        recentLevelEntry: null,
        stats: null,
        policy: null,
      },
      difficulty: {
        applied: false,
        reason: "데이터 없음",
        applied_mix: null,
        policy_level: null,
        recent_correct_rate: null,
        low_box_concept_count: null,
      },
      access: EMPTY_ACCESS,
      free_sessions_left: EMPTY_ACCESS.free_sessions_left,
      pro_until: EMPTY_ACCESS.pro_until,
    })
  }
}
// GET: 대시보드에 필요한 누적 집계/레벨 평가/난이도 정보를 반환한다.

// 사용법: /dashboard 클라이언트가 요약 데이터를 요청한다.















