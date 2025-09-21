"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useTranslation } from "@/lib/i18n"
import { useKeyboardNavigation } from "@/hooks/use-keyboard-navigation"
import { CheckCircle, SkipForward } from "lucide-react"

interface AnswerInputProps {
  onSubmit: (answer: string) => void
  onSkip: () => void
  disabled?: boolean
  placeholder?: string
}

export function AnswerInput({ onSubmit, onSkip, disabled = false, placeholder }: AnswerInputProps) {
  const [answer, setAnswer] = useState("")
  const { t } = useTranslation()

  const handleSubmit = () => {
    if (answer.trim()) {
      onSubmit(answer.trim())
      setAnswer("")
    }
  }

  const handleSkip = () => {
    onSkip()
    setAnswer("")
  }

  useKeyboardNavigation({
    onEnter: handleSubmit,
    onEscape: handleSkip,
    enabled: !disabled,
  })

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        handleSubmit()
      }}
      className="space-y-4"
    >
      <Input
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
        placeholder={placeholder || t("learn.answer.placeholder")}
        disabled={disabled}
        className="text-lg py-3"
        autoFocus
        aria-label="영어 답안 입력"
      />
      <div className="flex gap-3 justify-center">
        <Button type="button" variant="outline" onClick={handleSkip} disabled={disabled} aria-label="문제 건너뛰기">
          <SkipForward className="mr-2 h-4 w-4" />
          {t("learn.skip")}
        </Button>
        <Button type="submit" disabled={disabled || !answer.trim()} aria-label="답안 확인">
          <CheckCircle className="mr-2 h-4 w-4" />
          {t("learn.check")}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground text-center">Enter로 확인, Esc로 건너뛰기</p>
    </form>
  )
}
