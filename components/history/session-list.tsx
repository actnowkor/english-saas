// 경로: components/history/session-list.tsx
// 역할: 이력 목록 카드 리스트. 각 항목에서 다시풀기 버튼 제공
// 관계: app/history/page.tsx에서 사용, 데이터는 /api/history
"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useTranslation } from "@/lib/i18n"
import { Clock, Target, Calendar, RotateCcw } from "lucide-react"
import { format } from "date-fns"

// Local types (Option A): keep scope minimal to this component
type SessionType = "standard" | "review_only" | "new_only" | "weakness"

interface HistorySession {
  session_id: string
  session_type: SessionType
  date: string
  correct_rate: number
  time_spent_sec: number
  total_items: number
}

interface SessionListProps {
  sessions: HistorySession[]
  onOpenReplay: (sessionId: string) => void
}

export function SessionList({ sessions, onOpenReplay }: SessionListProps) {
  const { t } = useTranslation()

  if (sessions.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6 text-center">
          <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">{t("history.list.empty")}</p>
        </CardContent>
      </Card>
    )
  }

  const getScoreColor = (rate: number) => {
    if (rate >= 80) return "text-green-600"
    if (rate >= 60) return "text-yellow-600"
    return "text-red-600"
  }

  const getSessionTypeBadge = (type: SessionType) => {
    const variants: Record<SessionType, "default" | "secondary" | "outline" | "destructive"> = {
      standard: "default",
      review_only: "secondary",
      new_only: "outline",
      weakness: "destructive",
    }
    return variants[type]
  }

  return (
    <div className="space-y-3">
      {sessions.map((session) => (
        <Card key={session.session_id} className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant={getSessionTypeBadge(session.session_type)}>
                    {t(`history.session.type.${session.session_type}`)}
                  </Badge>
                  <span className="text-sm text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-3 w-3" /> {format(new Date(session.date), "yyyy/MM/dd HH:mm")}
                  </span>
                </div>

                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1">
                    <Target className="h-3 w-3" />
                    <span className={getScoreColor(session.correct_rate)}>정답률 {session.correct_rate}%</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    <span>소요시간 {Math.floor(session.time_spent_sec / 60)}:{(session.time_spent_sec % 60).toString().padStart(2, "0")}</span>
                  </div>
                  <span className="text-muted-foreground">{session.total_items}문제</span>
                </div>
              </div>

              <Button variant="outline" size="sm" onClick={() => onOpenReplay(session.session_id)}>
                <RotateCcw className="mr-2 h-3 w-3" /> 다시풀기
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
