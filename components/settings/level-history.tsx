// 경로: components/settings/level-history.tsx
// 역할: 설정 화면에서 사용자 레벨 변경 이력을 보여주는 컴포넌트
// 의존관계: app/api/settings/level-history/route.ts, components/ui/card
// 포함 함수: LevelHistory()

"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { format } from "date-fns"
import { Sparkles, History } from "lucide-react"

type LevelHistoryEntry = {
  level: number
  source: string
  changed_at: string
}

export function LevelHistory() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [items, setItems] = useState<LevelHistoryEntry[]>([])

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const res = await fetch("/api/settings/level-history", { cache: "no-store" })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const json = await res.json()
        if (!mounted) return
        setItems(Array.isArray(json?.items) ? json.items : [])
        setError(null)
      } catch (e: any) {
        if (!mounted) return
        setError(e?.message ?? "failed")
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => {
      mounted = false
    }
  }, [])

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" /> 레벨 이력
          </CardTitle>
          <CardDescription>레벨 변동을 불러오는 중입니다.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {Array.from({ length: 3 }).map((_, idx) => (
            <Skeleton key={idx} className="h-10 w-full" />
          ))}
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>레벨 이력을 불러오지 못했습니다. {error}</AlertDescription>
      </Alert>
    )
  }

  if (items.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" /> 레벨 이력
          </CardTitle>
          <CardDescription>아직 레벨 변동 기록이 없습니다.</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5" /> 레벨 이력
        </CardTitle>
        <CardDescription>최근 자동 승급 및 수동 조정 기록입니다.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.map((item) => {
          const dateLabel = format(new Date(item.changed_at), "yyyy/MM/dd HH:mm")
          const sourceLabel = item.source === "auto_assessment" ? "자동 평가" : item.source
          return (
            <div key={`${item.level}-${item.changed_at}`} className="flex items-start justify-between border-b pb-3 last:border-b-0 last:pb-0">
              <div>
                <p className="font-semibold text-lg flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" /> L{item.level}
                </p>
                <p className="text-sm text-muted-foreground">{dateLabel}</p>
              </div>
              <Badge variant="outline">{sourceLabel}</Badge>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
// LevelHistory: 설정 화면에서 레벨 변동 히스토리를 표시한다.

// 사용법: /settings 페이지에서 호출해 렌더링한다.

