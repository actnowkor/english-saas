// 경로: lib/logic/grade-utils.ts
// 역할: 사용자 답안을 채점하는 순수 함수 모음
// 의존관계: 없음
// 포함 함수: gradeAnswer()

export type GradeLabel = "correct" | "variant" | "near_miss" | "wrong"

export function gradeAnswer(
  userAnswer: string,
  canonical: string,
  variants: string[],
  nearMisses: string[]
): { label: GradeLabel; feedback: string } {
  const normalize = (value: string) =>
    value
      .trim()
      .toLowerCase()
      .replace(/\s+/g, " ")
      .replace(/[.,!?;:\"']/g, "")

  const levenshtein = (a: string, b: string) => {
    const m = a.length
    const n = b.length
    const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0))

    for (let i = 0; i <= m; i++) dp[i][0] = i
    for (let j = 0; j <= n; j++) dp[0][j] = j

    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1,
          dp[i][j - 1] + 1,
          dp[i - 1][j - 1] + cost,
        )
      }
    }

    return dp[m][n]
  }

  const normalizedAnswer = normalize(userAnswer)
  const canonicalAnswer = normalize(canonical)
  const normalizedVariants = variants.map(normalize)
  const normalizedNearMisses = nearMisses.map(normalize)

  if (!normalizedAnswer) {
    return { label: "wrong", feedback: "답안을 입력해 주세요." }
  }

  if (normalizedAnswer === canonicalAnswer) {
    return { label: "correct", feedback: "정답입니다!" }
  }

  if (normalizedVariants.includes(normalizedAnswer)) {
    return { label: "variant", feedback: "정답으로 인정되는 표현입니다." }
  }

  const distance = levenshtein(normalizedAnswer, canonicalAnswer)
  if (normalizedNearMisses.includes(normalizedAnswer) || distance <= 2) {
    return { label: "near_miss", feedback: "거의 맞았어요! 표현을 조금만 다듬어 보세요." }
  }

  return { label: "wrong", feedback: "다음 문제에서 다시 도전해 보세요." }
}