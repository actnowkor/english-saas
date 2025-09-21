// 경로: app/page.tsx
// 역할: 루트 경로(/)를 마케팅 랜딩 페이지로 구성

import { MarketingHeader } from "@/components/marketing/header"
import { Hero, Principles, Features, Pricing, Footer } from "@/components/marketing/sections"

export default function HomePage() {
  return (
    <main>
      <MarketingHeader />
      <Hero />
      <Principles />
      <Features />
      <Pricing />
      <Footer />
    </main>
  )
}
