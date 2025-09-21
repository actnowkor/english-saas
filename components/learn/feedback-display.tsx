"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useTranslation } from "@/lib/i18n"
import { CheckCircle, XCircle, AlertCircle, ArrowRight } from "lucide-react"
import type { Grade } from "@/lib/mock-data"

interface FeedbackDisplayProps {
  grade: Grade
  correctAnswer: string
  userAnswer: string
  onNext: () => void
  isLastItem?: boolean
}

export function FeedbackDisplay({ grade, correctAnswer, userAnswer, onNext, isLastItem }: FeedbackDisplayProps) {
  const { t } = useTranslation()

  const getIcon = () => {
    switch (grade.label) {
      case "correct":
        return <CheckCircle className="h-5 w-5 text-green-600" />
      case "variant":
        return <CheckCircle className="h-5 w-5 text-blue-600" />
      case "near_miss":
        return <AlertCircle className="h-5 w-5 text-yellow-600" />
      case "wrong":
        return <XCircle className="h-5 w-5 text-red-600" />
    }
  }

  const getBadgeVariant = () => {
    switch (grade.label) {
      case "correct":
        return "default"
      case "variant":
        return "secondary"
      case "near_miss":
        return "outline"
      case "wrong":
        return "destructive"
    }
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardContent className="pt-6 space-y-4">
        <div className="flex items-center justify-center gap-2">
          {getIcon()}
          <Badge variant={getBadgeVariant()}>{t(`learn.label.${grade.label}`)}</Badge>
        </div>

        <div className="space-y-3 text-center">
          <div>
            <p className="text-sm text-muted-foreground">내 답안</p>
            <p className="font-medium">{userAnswer}</p>
          </div>

          {grade.label !== "correct" && (
            <div>
              <p className="text-sm text-muted-foreground">정답</p>
              <p className="font-medium text-green-600">{correctAnswer}</p>
            </div>
          )}

          {grade.feedback_short && (
            <div className="bg-muted/50 rounded-lg p-3">
              <p className="text-sm">{grade.feedback_short}</p>
            </div>
          )}
        </div>

        <div className="flex justify-center pt-2">
          <Button onClick={onNext}>
            {isLastItem ? (
              <>
                {t("learn.finish")}
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            ) : (
              <>
                {t("learn.next")}
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
