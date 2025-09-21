"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { AppLayout } from "@/components/layout/app-layout"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { ProblemFilters } from "@/components/admin/problem-filters"
import { ProblemTable } from "@/components/admin/problem-table"
import { useTranslation } from "@/lib/i18n"
import { mockProblems } from "@/lib/mock-data"
import type { Problem } from "@/lib/mock-data"
import { Plus, FileText } from "lucide-react"

export default function AdminProblemsPage() {
  const [problems, setProblems] = useState<Problem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [levelFilter, setLevelFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [conceptFilter, setConceptFilter] = useState("all")
  const { t } = useTranslation()
  const router = useRouter()

  useEffect(() => {
    const loadProblems = async () => {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000))
      setProblems(mockProblems)
      setLoading(false)
    }

    loadProblems()
  }, [])

  const filteredProblems = useMemo(() => {
    return problems.filter((problem) => {
      const matchesSearch =
        !searchQuery ||
        problem.korean_text.toLowerCase().includes(searchQuery.toLowerCase()) ||
        problem.english_answer.toLowerCase().includes(searchQuery.toLowerCase()) ||
        problem.concept_key.toLowerCase().includes(searchQuery.toLowerCase())

      const matchesLevel = levelFilter === "all" || problem.level === levelFilter
      const matchesStatus = statusFilter === "all" || problem.status === statusFilter
      const matchesConcept = conceptFilter === "all" || problem.concept_key === conceptFilter

      return matchesSearch && matchesLevel && matchesStatus && matchesConcept
    })
  }, [problems, searchQuery, levelFilter, statusFilter, conceptFilter])

  const handleEditProblem = (problemId: string) => {
    router.push(`/admin/problems/${problemId}`)
  }

  const handleToggleStatus = (problemId: string, newStatus: "draft" | "approved") => {
    setProblems((prev) =>
      prev.map((problem) =>
        problem.id === problemId ? { ...problem, status: newStatus, updated_at: new Date().toISOString() } : problem,
      ),
    )
  }

  const handleClearFilters = () => {
    setSearchQuery("")
    setLevelFilter("all")
    setStatusFilter("all")
    setConceptFilter("all")
  }

  if (loading) {
    return (
      <ProtectedRoute requireAdmin>
        <AppLayout>
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <Skeleton className="h-8 w-48 mb-2" />
                <Skeleton className="h-4 w-96" />
              </div>
              <Skeleton className="h-10 w-24" />
            </div>

            <div className="space-y-4">
              <div className="flex gap-4">
                <Skeleton className="h-10 flex-1" />
                <Skeleton className="h-10 w-32" />
                <Skeleton className="h-10 w-32" />
                <Skeleton className="h-10 w-40" />
              </div>

              <div className="rounded-md border">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center space-x-4 p-4 border-b last:border-b-0">
                    <Skeleton className="h-4 flex-1" />
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-8 w-16" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </AppLayout>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute requireAdmin>
      <AppLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                <FileText className="h-8 w-8" />
                {t("admin.problems.title")}
              </h1>
              <p className="text-muted-foreground">
                총 {problems.length}개 문제 중 {filteredProblems.length}개 표시
              </p>
            </div>
            <Button onClick={() => router.push("/admin/problems/new")}>
              <Plus className="mr-2 h-4 w-4" />새 문제 추가
            </Button>
          </div>

          <ProblemFilters
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            levelFilter={levelFilter}
            onLevelChange={setLevelFilter}
            statusFilter={statusFilter}
            onStatusChange={setStatusFilter}
            conceptFilter={conceptFilter}
            onConceptChange={setConceptFilter}
            onClearFilters={handleClearFilters}
          />

          <ProblemTable
            problems={filteredProblems}
            onEditProblem={handleEditProblem}
            onToggleStatus={handleToggleStatus}
          />
        </div>
      </AppLayout>
    </ProtectedRoute>
  )
}
