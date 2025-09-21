"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { AppLayout } from "@/components/layout/app-layout"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { useTranslation } from "@/lib/i18n"
import { useToast } from "@/hooks/use-toast"
import { mockProblems } from "@/lib/mock-data"
import type { Problem } from "@/lib/mock-data"
import { ArrowLeft, Save, Eye } from "lucide-react"

export default function ProblemDetailPage() {
  const [problem, setProblem] = useState<Problem | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const { t } = useTranslation()
  const { toast } = useToast()
  const router = useRouter()
  const params = useParams()
  const problemId = params.id as string

  useEffect(() => {
    const loadProblem = async () => {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 800))

      if (problemId === "new") {
        setProblem({
          id: "",
          korean_text: "",
          english_answer: "",
          allowed_variants: "",
          near_misses: "",
          level: "L1",
          concept_key: "",
          tags: [],
          status: "draft",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
      } else {
        const foundProblem = mockProblems.find((p) => p.id === problemId)
        setProblem(foundProblem || null)
      }
      setLoading(false)
    }

    loadProblem()
  }, [problemId])

  const handleSave = async () => {
    if (!problem) return

    setSaving(true)
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000))

      toast({
        title: t("admin.problems.detail.saved"),
        description: "문제가 성공적으로 저장되었습니다",
      })

      if (problemId === "new") {
        router.push("/admin/problems")
      }
    } catch (error) {
      toast({
        title: t("admin.problems.detail.error"),
        description: "문제 저장에 실패했습니다",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const handlePublish = async () => {
    if (!problem) return

    setProblem({ ...problem, status: "approved" })
    await handleSave()
  }

  if (loading) {
    return (
      <ProtectedRoute requireAdmin>
        <AppLayout>
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" disabled>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="h-8 w-48 bg-muted animate-pulse rounded" />
            </div>
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="space-y-2">
                    <div className="h-4 w-24 bg-muted animate-pulse rounded" />
                    <div className="h-10 w-full bg-muted animate-pulse rounded" />
                  </div>
                ))}
              </div>
              <div className="h-64 bg-muted animate-pulse rounded" />
            </div>
          </div>
        </AppLayout>
      </ProtectedRoute>
    )
  }

  if (!problem) {
    return (
      <ProtectedRoute requireAdmin>
        <AppLayout>
          <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
            <p className="text-muted-foreground">문제를 찾을 수 없습니다</p>
            <Button onClick={() => router.push("/admin/problems")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              문제 목록으로 돌아가기
            </Button>
          </div>
        </AppLayout>
      </ProtectedRoute>
    )
  }

  const isNew = problemId === "new"

  return (
    <ProtectedRoute requireAdmin>
      <AppLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={() => router.push("/admin/problems")}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <h1 className="text-3xl font-bold tracking-tight">
                  {isNew ? "새 문제 추가" : t("admin.problems.detail.title")}
                </h1>
                <p className="text-muted-foreground">{isNew ? "새로운 문제를 생성합니다" : `문제 ID: ${problem.id}`}</p>
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={handleSave} disabled={saving}>
                <Save className="mr-2 h-4 w-4" />
                {saving ? "저장 중..." : t("admin.problems.detail.save")}
              </Button>
              {problem.status === "draft" && (
                <Button onClick={handlePublish} disabled={saving}>
                  {t("admin.problems.publish")}
                </Button>
              )}
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>기본 정보</CardTitle>
                  <CardDescription>문제의 기본 내용을 입력하세요</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="korean-text">한국어 제시문</Label>
                    <Textarea
                      id="korean-text"
                      value={problem.korean_text}
                      onChange={(e) => setProblem({ ...problem, korean_text: e.target.value })}
                      placeholder="번역할 한국어 문장을 입력하세요"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="english-answer">영어 정답</Label>
                    <Input
                      id="english-answer"
                      value={problem.english_answer}
                      onChange={(e) => setProblem({ ...problem, english_answer: e.target.value })}
                      placeholder="정확한 영어 번역을 입력하세요"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="variants">허용 변형 (선택사항)</Label>
                    <Input
                      id="variants"
                      value={problem.allowed_variants || ""}
                      onChange={(e) => setProblem({ ...problem, allowed_variants: e.target.value })}
                      placeholder="허용되는 변형들을 | 로 구분하여 입력"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="near-misses">근접 오답 (선택사항)</Label>
                    <Input
                      id="near-misses"
                      value={problem.near_misses || ""}
                      onChange={(e) => setProblem({ ...problem, near_misses: e.target.value })}
                      placeholder="흔한 실수들을 | 로 구분하여 입력"
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>메타데이터</CardTitle>
                  <CardDescription>문제 분류 및 태그 정보</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="level">레벨</Label>
                      <Select
                        value={problem.level}
                        onValueChange={(value: any) => setProblem({ ...problem, level: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 9 }, (_, i) => (
                            <SelectItem key={i} value={`L${i + 1}`}>
                              L{i + 1}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="concept">콘셉트 키</Label>
                      <Select
                        value={problem.concept_key}
                        onValueChange={(value) => setProblem({ ...problem, concept_key: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="콘셉트 선택" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="be.pres.svc.aff">현재 긍정문</SelectItem>
                          <SelectItem value="be.pres.svc.neg">현재 부정문</SelectItem>
                          <SelectItem value="modal.can.ability">능력 표현</SelectItem>
                          <SelectItem value="past.simple">과거 시제</SelectItem>
                          <SelectItem value="present.perfect">현재완료</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="h-5 w-5" />
                  {t("admin.problems.detail.preview")}
                </CardTitle>
                <CardDescription>사용자에게 표시될 모습을 미리 확인하세요</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="border rounded-lg p-4 bg-muted/50">
                  <p className="text-sm text-muted-foreground mb-2">문제</p>
                  <p className="text-lg font-medium">{problem.korean_text || "한국어 제시문을 입력하세요"}</p>
                </div>

                <Separator />

                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-muted-foreground">정답</p>
                    <p className="font-medium text-green-600">{problem.english_answer || "영어 정답을 입력하세요"}</p>
                  </div>

                  {problem.allowed_variants && (
                    <div>
                      <p className="text-sm text-muted-foreground">허용 변형</p>
                      <p className="text-sm">{problem.allowed_variants}</p>
                    </div>
                  )}

                  {problem.near_misses && (
                    <div>
                      <p className="text-sm text-muted-foreground">근접 오답</p>
                      <p className="text-sm text-red-600">{problem.near_misses}</p>
                    </div>
                  )}
                </div>

                <Separator />

                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>레벨: {problem.level}</span>
                  <span>•</span>
                  <span>콘셉트: {problem.concept_key || "미설정"}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </AppLayout>
    </ProtectedRoute>
  )
}
