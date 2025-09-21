// components/dashboard/priority-concepts.tsx
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

export type PriorityConcept = {
  key: string
  name: string
  reason: "recent_difficulty" | "spaced" | "next_step"
}

export function PriorityConcepts({
  items,
  onStart,
}: {
  items: PriorityConcept[]
  onStart: (conceptKey: string) => void
}) {
  const label = (r: PriorityConcept["reason"]) =>
    r === "recent_difficulty" ? "최근 도전이 있었어요" : r === "spaced" ? "오랜만이에요" : "다음 진도"

  return (
    <div className="space-y-3">
      {items.map((c) => (
        <div key={c.key} className="flex items-center justify-between gap-3 border rounded-lg p-3">
          <div className="flex flex-col">
            <div className="font-medium">{c.name}</div>
            <div className="text-xs text-muted-foreground">{c.key}</div>
            <div className="mt-1">
              <Badge variant="secondary">{label(c.reason)}</Badge>
            </div>
          </div>
          <Button onClick={() => onStart(c.key)} size="sm">
            바로 학습
          </Button>
        </div>
      ))}
      {items.length === 0 && (
        <div className="text-sm text-muted-foreground">추천을 준비 중입니다. 먼저 기본 학습을 진행해 주세요.</div>
      )}
    </div>
  )
}
