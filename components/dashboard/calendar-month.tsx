// components/dashboard/calendar-month.tsx
// ✅ 간단한 달력: 학습한 날짜만 칠해줍니다(정확한 달력/요일 배치는 MVP 단순 버전)
import { useMemo } from "react"

type Props = {
  year: number
  month: number // 1~12
  learnedDates: string[] // "YYYY-MM-DD"
}

// 🔹 유틸: 해당 월의 일수 계산
function getDaysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate()
}

// 🔹 유틸: 문자열 날짜 셋으로
function toSet(arr: string[]) {
  return new Set(arr)
}

export function CalendarMonth({ year, month, learnedDates }: Props) {
  const totalDays = getDaysInMonth(year, month)
  const learnedSet = useMemo(() => toSet(learnedDates), [learnedDates])
  const ym = `${year}-${String(month).padStart(2, "0")}`

  return (
    <div className="grid grid-cols-7 gap-2">
      {/* 요일 헤더 (간단 표기) */}
      {["일", "월", "화", "수", "목", "금", "토"].map((d) => (
        <div key={d} className="text-xs text-muted-foreground text-center">
          {d}
        </div>
      ))}

      {/* 날짜 칸 */}
      {Array.from({ length: totalDays }, (_, i) => i + 1).map((day) => {
        const dateStr = `${ym}-${String(day).padStart(2, "0")}`
        const learned = learnedSet.has(dateStr)
        return (
          <div
            key={day}
            title={learned ? "학습함" : "학습안함"}
            className={`h-10 rounded-md border flex items-center justify-center text-sm ${
              learned
                ? "bg-primary/10 border-primary/30"
                : "bg-muted/30 border-muted"
            }`}
          >
            {day}
          </div>
        )
      })}
    </div>
  )
}
