"use client"

import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { SessionItem } from "@/lib/mock-data"

interface ProblemCardProps {
  item: SessionItem
  currentIndex: number
  totalItems: number
}

export function ProblemCard({ item, currentIndex, totalItems }: ProblemCardProps) {
  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <Badge variant="outline" className="text-xs">
            {item.snapshot.level} · 난이도 {item.snapshot.difficulty}
          </Badge>
          <div className="text-sm text-muted-foreground">
            {currentIndex + 1} / {totalItems}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="text-center">
          <p className="text-lg font-medium text-muted-foreground mb-2">다음 문장을 영어로 번역하세요</p>
          <p className="text-2xl font-bold text-balance">{item.snapshot.source_ko}</p>
        </div>
      </CardContent>
    </Card>
  )
}
