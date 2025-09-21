import pathlib

path = pathlib.Path(r"c:/actnow-coding/english-learning-app/app/api/dashboard/route.ts")
text = path.read_text(encoding="utf-8")
lines = text.splitlines()

def find_index(prefix: str) -> int:
    for idx, line in enumerate(lines):
        if line.startswith(prefix):
            return idx
    raise ValueError(f"prefix {prefix!r} not found")

start = find_index("type DashboardData = {")
fn_index = find_index("function toYMD")

block = """type DashboardData = {
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
  }
  difficulty: {
    applied: boolean
    reason: string
    applied_mix: Record[str, number] | null
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
"""

new_lines = block.splitlines()
lines = lines[:start] + new_lines + lines[fn_index:]
path.write_text("\n".join(lines) + "\n", encoding="utf-8")
