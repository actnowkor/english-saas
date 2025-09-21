import pathlib

path = pathlib.Path(r"c:/actnow-coding/english-learning-app/components/dashboard/start-learning-card.tsx")
text = path.read_text(encoding="utf-8")
insertion = """
type AccessBadge = {
  label: string
  variant: "default" | "secondary" | "destructive"
}

function formatBadgeDate(value: string | null | undefined) {
  if (!value) return "-"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "-"
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}.${month}.${day}`
}
// formatBadgeDate: Badge 노출용 만료일을 YYYY.MM.DD 문자열로 변환한다.

function buildAccessBadge(access?: AccessSummary | null): AccessBadge | null {
  if (!access) return null
  if (access.status === "pro") {
    const until = formatBadgeDate(access.pro_until)
    return { label: `무제한 이용권 ~${until}`, variant: "default" }
  }
  const limit = Math.max(1, Number(access.free_sessions_limit ?? 1))
  const left = Math.max(0, Number(access.free_sessions_left ?? 0))
  const label = `무료 ${left}/${limit}`
  return { label, variant: left > 0 ? "secondary" : "destructive" }
}
// buildAccessBadge: 이용권 상태에 따라 표시할 배지 텍스트와 색상을 계산한다.
"""

marker = "type LearnCheckResponse = {"
if marker not in text:
  raise SystemExit("marker not found")
updated = text.replace(
  marker,
  marker + insertion
)
path.write_text(updated, encoding="utf-8")
