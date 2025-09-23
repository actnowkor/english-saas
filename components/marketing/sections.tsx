// 경로: components/marketing/sections.tsx
// 역할: 마케팅 랜딩 페이지의 주요 섹션(Hero, Principles, Features, Pricing, Footer)을 렌더링
// 의존관계: components/ui/button.tsx, next/link
// 포함 함수: SectionContainer(), Hero(), Principles(), Features(), Pricing(), Footer()

import type { ReactNode } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
  Brain,
  Repeat2,
  TrendingUp,
  CheckCircle2,
  BookOpen,
  BarChart3,
  Route as RouteIcon,
} from "lucide-react"

function SectionContainer({ id, children, className }: { id?: string; children: ReactNode; className?: string }) {
  return (
    <section id={id} className={`mx-auto w-full max-w-3xl px-4 ${className ?? ""}`}>
      {children}
    </section>
  )
}
// SectionContainer: 각 섹션을 센터 정렬된 래퍼로 감싼다.

export function Hero() {
  return (
    <SectionContainer id="hero" className="py-12 md:py-16">
      <div className="space-y-8 text-center">
        <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-balance">
          망각곡선을 넘어, 반복으로 완성하는 영어 뇌 루틴
        </h1>
        <p className="text-muted-foreground leading-7 md:text-lg text-balance">
          에빙하우스 망각곡선을 기준으로 설계한 반복 스케줄과 의미 단위 복습으로, 배운 표현이 장기 기억에 단단히 안착합니다. 매일 정리된 루틴을 따라가며 자연스럽게 문장을 떠올리는 힘을 키워보세요.
        </p>
        <div className="flex justify-center gap-3 flex-wrap">
          <Button asChild size="lg">
            <Link href="/signin">무료 체험 시작</Link>
          </Button>
          <Button asChild size="lg" variant="ghost">
            <Link href="#features">학습 설계 살펴보기</Link>
          </Button>
        </div>
        <div className="flex flex-wrap justify-center gap-3 text-primary/90">
          <div className="rounded-xl bg-primary/10 p-4"><CheckCircle2 className="w-10 h-10" aria-hidden="true" /></div>
          <div className="rounded-xl bg-primary/10 p-4"><Brain className="w-10 h-10" aria-hidden="true" /></div>
          <div className="rounded-xl bg-primary/10 p-4"><Repeat2 className="w-10 h-10" aria-hidden="true" /></div>
          <div className="rounded-xl bg-primary/10 p-4"><BarChart3 className="w-10 h-10" aria-hidden="true" /></div>
          <div className="rounded-xl bg-primary/10 p-4"><BookOpen className="w-10 h-10" aria-hidden="true" /></div>
          <div className="rounded-xl bg-primary/10 p-4"><RouteIcon className="w-10 h-10" aria-hidden="true" /></div>
        </div>
      </div>
    </SectionContainer>
  )
}
// Hero: 랜딩 페이지 상단 인트로 영역을 구성한다.

export function Principles() {
  return (
    <SectionContainer id="principles" className="py-12 md:py-16">
      <h2 className="text-2xl md:text-3xl font-bold mb-6 text-center">학습 철학</h2>
      <div className="space-y-4">
        <div className="rounded-2xl border bg-card shadow-sm p-5">
          <div className="flex flex-col items-center text-center space-y-2">
            <Brain className="w-6 h-6 text-primary" aria-hidden="true" />
            <div className="font-semibold">과학 기반 문장 구성 연습</div>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            정보 주입형 학습이 아니라 스스로 문장을 구성하며 학습합니다. 망각 곡선을 고려한 반복 주기로 기억 속에 각인됩니다.
          </p>
        </div>
        <div className="rounded-2xl border bg-card shadow-sm p-5">
          <div className="flex flex-col items-center text-center space-y-2">
            <Repeat2 className="w-6 h-6 text-primary" aria-hidden="true" />
            <div className="font-semibold">개인 맞춤 반복</div>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            사용자의 취약 영역을 분석해 최적의 복습 타이밍을 제안하고, 회차마다 조금씩 난이도를 조절합니다.
          </p>
        </div>
        <div className="rounded-2xl border bg-card shadow-sm p-5">
          <div className="flex flex-col items-center text-center space-y-2">
            <TrendingUp className="w-6 h-6 text-primary" aria-hidden="true" />
            <div className="font-semibold">지속 가능한 성장</div>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            학습 기록을 추적하며, 다음 단계로 넘어갈 준비가 되었는지 자동으로 진단합니다.
          </p>
        </div>
      </div>
    </SectionContainer>
  )
}
// Principles: 서비스 학습 철학을 소개한다.

export function Features() {
  return (
    <SectionContainer id="features" className="py-12 md:py-16">
      <h2 className="text-2xl md:text-3xl font-bold mb-6 text-center">주요 기능</h2>
      <div className="space-y-4">
        <div className="rounded-2xl border bg-card shadow-sm p-5">
          <div className="flex flex-col items-center text-center space-y-2">
            <BookOpen className="w-6 h-6 text-primary" aria-hidden="true" />
            <div className="text-lg font-semibold">맞춤 학습 모듈</div>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            레벨·목표에 따라 구성된 학습 루트를 제공합니다. 진행 상황에 맞춰 새 학습과 복습을 균형 있게 배치합니다.
          </p>
        </div>
        <div className="rounded-2xl border bg-card shadow-sm p-5">
          <div className="flex flex-col items-center text-center space-y-2">
            <BarChart3 className="w-6 h-6 text-primary" aria-hidden="true" />
            <div className="text-lg font-semibold">성장 리포트</div>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            학습 시간, 문항 정답률, 키워드 숙련도 등을 한눈에 확인할 수 있는 대시보드를 제공합니다.
          </p>
        </div>
        <div className="rounded-2xl border bg-card shadow-sm p-5">
          <div className="flex flex-col items-center text-center space-y-2">
            <RouteIcon className="w-6 h-6 text-primary" aria-hidden="true" />
            <div className="text-lg font-semibold">맞춤 경로 추천</div>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            사용자의 목표와 학습 패턴을 분석해 다음에 배워야 할 문장과 단계를 자동으로 추천합니다.
          </p>
        </div>
      </div>
    </SectionContainer>
  )
}
// Features: 제품의 핵심 기능을 소개한다.

export function Pricing() {
  return (
    <SectionContainer id="pricing" className="py-12 md:py-16">
      <h2 className="text-2xl md:text-3xl font-bold mb-4 text-center text-balance">가볍게 체험하고, 필요할 때 확장하세요</h2>
      <p className="text-base text-muted-foreground mb-10 text-center leading-7 text-balance">
        베타 기간에는 하루 최대 10회 학습을 무료로 경험하고, 정식 출시 이후에는 하루 1회 무료 세션으로 핵심 루틴을 이어갈 수 있습니다.
      </p>
      <div className="space-y-4">
        <div className="rounded-2xl border bg-card shadow-sm p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between md:text-left text-center">
            <div>
              <div className="text-lg font-semibold">무료 체험 (베타 한정)</div>
              <p className="text-sm text-muted-foreground leading-6">
                지금 가입하면 하루 최대 10세션을 반복 주기대로 체험하고, 정식 출시 후에도 하루 1세션은 계속 무료로 제공됩니다.
              </p>
            </div>
            <div className="md:text-right">
              <div className="text-2xl font-bold">\0</div>
              <div className="text-xs text-muted-foreground">베타 10세션 · 정식 1세션</div>
            </div>
          </div>
          <ul className="mt-4 space-y-2 text-sm text-muted-foreground leading-6">
            <li>· 망각곡선 기반 반복 루틴 체험</li>
            <li>· 핵심 학습 리포트 미리보기</li>
            <li>· 목표 레벨 진단 1회 제공</li>
          </ul>
        </div>

        <div className="rounded-2xl border bg-card shadow-sm p-6 ring-1 ring-primary/40">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between md:text-left text-center">
            <div>
              <div className="text-lg font-semibold">30일 무제한 이용권</div>
              <p className="text-sm text-muted-foreground leading-6">
                30일 동안 반복 루틴과 복습 스케줄을 제한 없이 이용해 장기 기억을 단단히 다질 수 있습니다.
              </p>
            </div>
            <div className="md:text-right">
              <div className="text-2xl font-bold text-primary">\5,500</div>
              <div className="text-xs text-muted-foreground">런칭 특가 · 정가 \9,900</div>
            </div>
          </div>
          <ul className="mt-4 space-y-2 text-sm text-muted-foreground leading-6">
            <li>· 학습·복습 무제한 진행</li>
            <li>· 전체 리포트·분석 기능 제공</li>
            <li>· 맞춤 커리큘럼 자동 추천</li>
          </ul>
          <div className="mt-4 flex justify-end">
            <Button asChild>
              <Link href="/signin?redirectedFrom=%2Fsettings%3Ffrom%3Dmarketing">로그인하고 이용권 안내 보기</Link>
            </Button>
          </div>
        </div>
      </div>
    </SectionContainer>
  )
}
// Pricing: 무료 체험과 유료 이용권 정보를 안내한다.

export function Footer() {
  return (
    <footer className="border-t border-border/40">
      <div className="mx-auto w-full max-w-3xl px-4 py-8 text-sm text-muted-foreground">
        <div className="flex flex-wrap items-center justify-center gap-4">
          <a href="#hero">처음으로</a>
          <a href="#principles">학습 철학</a>
          <a href="#features">주요 기능</a>
          <a href="#pricing">요금 안내</a>
        </div>
        <div className="opacity-80 text-center mt-2">© {new Date().getFullYear()} Starting English</div>
        <div className="mt-2 text-xs text-center">Built with Next.js · Deployed on Vercel · Supabase Auth</div>
      </div>
    </footer>
  )
}
// Footer: 랜딩 페이지 하단 푸터를 렌더링한다.
