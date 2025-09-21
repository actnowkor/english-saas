"use client"

import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useTranslation } from "@/lib/i18n"
import { Search, X } from "lucide-react"

interface ProblemFiltersProps {
  searchQuery: string
  onSearchChange: (query: string) => void
  levelFilter: string
  onLevelChange: (level: string) => void
  statusFilter: string
  onStatusChange: (status: string) => void
  conceptFilter: string
  onConceptChange: (concept: string) => void
  onClearFilters: () => void
}

export function ProblemFilters({
  searchQuery,
  onSearchChange,
  levelFilter,
  onLevelChange,
  statusFilter,
  onStatusChange,
  conceptFilter,
  onConceptChange,
  onClearFilters,
}: ProblemFiltersProps) {
  const { t } = useTranslation()

  const hasActiveFilters = searchQuery || levelFilter !== "all" || statusFilter !== "all" || conceptFilter !== "all"

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t("admin.problems.search_placeholder")}
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="flex gap-2">
          <Select value={levelFilter} onValueChange={onLevelChange}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder={t("admin.problems.filter.level")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">모든 레벨</SelectItem>
              {Array.from({ length: 9 }, (_, i) => (
                <SelectItem key={i} value={`L${i + 1}`}>
                  L{i + 1}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={onStatusChange}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder={t("admin.problems.filter.status")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">모든 상태</SelectItem>
              <SelectItem value="draft">{t("admin.problems.status.draft")}</SelectItem>
              <SelectItem value="approved">{t("admin.problems.status.approved")}</SelectItem>
            </SelectContent>
          </Select>

          <Select value={conceptFilter} onValueChange={onConceptChange}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder={t("admin.problems.filter.concept")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">모든 콘셉트</SelectItem>
              <SelectItem value="be.pres.svc.aff">현재 긍정문</SelectItem>
              <SelectItem value="be.pres.svc.neg">현재 부정문</SelectItem>
              <SelectItem value="modal.can.ability">능력 표현</SelectItem>
              <SelectItem value="past.simple">과거 시제</SelectItem>
              <SelectItem value="present.perfect">현재완료</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {hasActiveFilters && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">활성 필터:</span>
          {searchQuery && <Badge variant="secondary">검색: {searchQuery}</Badge>}
          {levelFilter !== "all" && <Badge variant="secondary">레벨: {levelFilter}</Badge>}
          {statusFilter !== "all" && <Badge variant="secondary">상태: {statusFilter}</Badge>}
          {conceptFilter !== "all" && <Badge variant="secondary">콘셉트: {conceptFilter}</Badge>}
          <Button variant="ghost" size="sm" onClick={onClearFilters}>
            <X className="mr-1 h-3 w-3" />
            필터 초기화
          </Button>
        </div>
      )}
    </div>
  )
}
