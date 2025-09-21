"use client"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useTranslation } from "@/lib/i18n"

interface WeakConcept {
  concept_key: string
  name: string
  error_rate: number
}

interface WeakConceptsProps {
  concepts: WeakConcept[]
  onConceptClick?: (conceptKey: string) => void
}

export function WeakConcepts({ concepts, onConceptClick }: WeakConceptsProps) {
  const { t } = useTranslation()

  if (concepts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("dashboard.weak_concepts.title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">약한 콘셉트가 없습니다. 계속 학습해보세요!</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("dashboard.weak_concepts.title")}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          {concepts.map((concept) => (
            <Badge
              key={concept.concept_key}
              variant="secondary"
              className="cursor-pointer hover:bg-destructive/10 hover:text-destructive"
              onClick={() => onConceptClick?.(concept.concept_key)}
            >
              {concept.name} ({concept.error_rate}%)
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
