// 경로: components/history/replay-item.tsx
// 역할: 학습 히스토리에서 단일 문항 복습 카드 표시
// 의존관계: components/ui/*, lib/logic/grade-utils.ts
// 포함 함수: ReplayItem()

"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { gradeAnswer } from "@/lib/logic/grade-utils"
import { Eye, CheckCircle, XCircle, AlertCircle } from "lucide-react"

type StoredResult = {
  label?: string
  feedback?: string
}

export interface ReplayItemProps {
  item: {
    session_item_id: string
    replay_attempts: number
    stored_label?: string
    stored_feedback_short?: string
    user_answer_prev?: string
    concept_key?: string
    concept_ko?: string
    snapshot: {
      item_id: string
      level?: number
      source_ko: string
      answer_en: string
      allowed_variants_text: string[]
      near_misses_text: string[]
    }
  }
  index: number
}

export function ReplayItem({ item, index }: ReplayItemProps) {
  const [showPrevAnswer, setShowPrevAnswer] = useState(false)
  const [replayAnswer, setReplayAnswer] = useState("")
  const [replayResult, setReplayResult] = useState<StoredResult | null>(null)

  const getIcon = (label?: string) => {
    switch (label) {
      case "correct":
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case "variant":
        return <CheckCircle className="h-4 w-4 text-blue-600" />
      case "near_miss":
        return <AlertCircle className="h-4 w-4 text-yellow-600" />
      case "wrong":
        return <XCircle className="h-4 w-4 text-red-600" />
      default:
        return null
    }
  }

  const getBadgeVariant = (label?: string) => {
    switch (label) {
      case "correct":
        return "default"
      case "variant":
        return "secondary"
      case "near_miss":
        return "outline"
      case "wrong":
        return "destructive"
      default:
        return "outline"
    }
  }

  const formatLabel = (label?: string) => {
    switch (label) {
      case "correct":
        return "정답"
      case "variant":
        return "정답(허용)"
      case "near_miss":
        return "근접"
      case "wrong":
        return "오답"
      default:
        return "결과 없음"
    }
  }

  const handleReplaySubmit = () => {
    if (!replayAnswer.trim()) return
    const grade = gradeAnswer(
      replayAnswer,
      item.snapshot.answer_en,
      item.snapshot.allowed_variants_text,
      item.snapshot.near_misses_text,
    )
    setReplayResult({ label: grade.label, feedback: grade.feedback })
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm md:text-base font-medium">문제 {index + 1}</span>
            <Badge variant="outline" className="text-xs md:text-sm">
              {typeof item.snapshot.level === "number" ? `Level ${item.snapshot.level}` : "Level -"}
            </Badge>
          </div>
          {item.stored_label && (
            <div className="flex items-center gap-1">
              {getIcon(item.stored_label)}
              <Badge variant={getBadgeVariant(item.stored_label)}>{formatLabel(item.stored_label)}</Badge>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="text-center">
          <p className="text-base md:text-lg font-medium text-balance">{item.snapshot.source_ko}</p>
        </div>

        {item.user_answer_prev && showPrevAnswer && (
          <div className="bg-muted/40 rounded-md p-3">
            <p className="text-xs text-muted-foreground mb-1">이전 제출 답안</p>
            <p className="text-sm md:text-base font-medium break-words">{item.user_answer_prev}</p>
          </div>
        )}

        <div className="space-y-3">
          <Input
            value={replayAnswer}
            onChange={(e) => setReplayAnswer(e.target.value)}
            placeholder="복습 답안을 입력하세요"
            onKeyDown={(e) => {
              if (e.key === "Enter" && replayAnswer.trim()) handleReplaySubmit()
            }}
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowPrevAnswer((v) => !v)}>
              <Eye className="mr-2 h-3 w-3" /> 이전 답안 보기
            </Button>
            <Button size="sm" onClick={handleReplaySubmit} disabled={!replayAnswer.trim()}>
              <CheckCircle className="mr-2 h-3 w-3" /> 채점하기
            </Button>
          </div>
        </div>

        {replayResult && (
          <div className="bg-muted/40 rounded-md p-3">
            <div className="flex items-center gap-2 mb-2">
              {getIcon(replayResult.label)}
              <Badge variant={getBadgeVariant(replayResult.label)}>{formatLabel(replayResult.label)}</Badge>
            </div>
            <div className="space-y-1 text-sm">
              <p>
                결과: <span className="font-medium">{formatLabel(replayResult.label)}</span>
              </p>
              <p>
                정답: <span className="font-medium">{item.snapshot.answer_en}</span>
              </p>
              {(item.concept_ko || item.concept_key) && (
                <p>
                  개념: <span className="font-medium">{item.concept_ko ?? item.concept_key}</span>
                  {item.concept_ko && item.concept_key ? ` (${item.concept_key})` : ""}
                </p>
              )}
              {replayResult.feedback && (
                <p className="mt-1 text-sm text-muted-foreground">{replayResult.feedback}</p>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}