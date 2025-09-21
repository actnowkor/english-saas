// 경로: app/test/session-play/page.tsx
// 역할: 세션 생성 → 문항 표시 → 답변 입력 → 채점 & DB 저장 → 결과 표시 (라이트너까지)
// 의존: /api/test/session-start (세션 생성)
//      /api/test/grade (채점 + DB 저장 + SRS 갱신)

"use client"

import { useState } from "react"

type TestItem = {
  order_index: number
  item_id: string
  prompt_ko: string
  answer_en: string
  allowed_variants?: string[]
}

type StartPayload = {
  session_id: string
  items: TestItem[]
}

type GradeResult = {
  item_id: string
  user_answer: string
  correct: boolean
  expected: string
  accepted?: string[]
  reason?: string
}

export default function SessionPlayTestPage() {
  const [session, setSession] = useState<StartPayload | null>(null)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [results, setResults] = useState<GradeResult[] | null>(null)
  const [loading, setLoading] = useState(false)

  const handleStart = async () => {
    setLoading(true)
    setResults(null)
    const res = await fetch("/api/test/session-start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ limit: 10 }),
    })
    const json = await res.json()
    setSession(json)
    const init: Record<string, string> = {}
    json.items.forEach((it: TestItem) => (init[it.item_id] = ""))
    setAnswers(init)
    setLoading(false)
  }

  const handleSubmit = async () => {
    if (!session) return
    setLoading(true)
    const res = await fetch("/api/test/grade", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        session_id: session.session_id,
        answers: Object.entries(answers).map(([item_id, user_answer]) => ({
          item_id,
          user_answer,
        })),
      }),
    })
    const json = await res.json()
    setResults(json.results)
    setLoading(false)
  }

  return (
    <main className="p-6 space-y-4 max-w-3xl mx-auto">
      <h1 className="text-xl font-bold">세션/채점 테스트</h1>
      <button
        className="px-4 py-2 rounded bg-black text-white"
        onClick={handleStart}
        disabled={loading}
      >
        세션 시작
      </button>

      {session && (
        <div className="space-y-4">
          {session.items.map((it) => (
            <div key={it.item_id} className="border p-3 rounded">
              <div className="font-medium">Q{it.order_index}. {it.prompt_ko}</div>
              <input
                value={answers[it.item_id] ?? ""}
                onChange={(e) =>
                  setAnswers((prev) => ({ ...prev, [it.item_id]: e.target.value }))
                }
                className="mt-2 border rounded w-full p-2"
                placeholder="답을 입력하세요"
              />
              <div className="text-xs text-gray-500 mt-1">
                (정답예시: {it.answer_en})
              </div>
            </div>
          ))}
          <button
            onClick={handleSubmit}
            className="px-4 py-2 bg-blue-600 text-white rounded"
          >
            채점 제출
          </button>
        </div>
      )}

      {results && (
        <div className="space-y-2">
          <h2 className="text-lg font-semibold">채점 결과</h2>
          {results.map((r) => (
            <div key={r.item_id} className="border p-2 rounded">
              <div>답안: {r.user_answer}</div>
              <div>정답: {r.expected}</div>
              <div className={r.correct ? "text-green-600" : "text-red-600"}>
                {r.correct ? "정답" : "오답"}
              </div>
              {r.reason && <div className="text-xs">{r.reason}</div>}
            </div>
          ))}
        </div>
      )}
    </main>
  )
}
