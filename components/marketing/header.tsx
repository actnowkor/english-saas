// 경로: components/marketing/header.tsx
// 역할: 랜딩 페이지 헤더(스티키, 투명 배경)

"use client"

import Link from "next/link"
import { useState } from "react"
import { Button } from "@/components/ui/button"

export function MarketingHeader() {
  const [open, setOpen] = useState(false)
  return (
    <header className="sticky top-0 z-40 w-full backdrop-blur supports-[backdrop-filter]:bg-background/80 border-b border-border/40">
      <div className="mx-auto max-w-[1000px] px-4 py-3 flex items-center justify-between">
        <Link href="/" className="font-bold text-lg">Starting English</Link>
        <nav className="hidden md:flex items-center gap-6 text-sm">
          <a href="#principles" className="hover:text-primary">서비스 원리</a>
          <a href="#features" className="hover:text-primary">주요 기능</a>
          <a href="#pricing" className="hover:text-primary">가격</a>
          <Button asChild size="sm">
            <Link href="/signin">무료로 시작하기</Link>
          </Button>
        </nav>
        <button aria-label="menu" className="md:hidden" onClick={() => setOpen(!open)}>
          <span className="i-heroicons-bars-3 w-6 h-6" />
        </button>
      </div>
      {open && (
        <div className="md:hidden border-t border-border/40">
          <div className="mx-auto max-w-[1000px] px-4 py-3 grid gap-3 text-sm">
            <a href="#principles" onClick={() => setOpen(false)}>서비스 원리</a>
            <a href="#features" onClick={() => setOpen(false)}>주요 기능</a>
            <a href="#pricing" onClick={() => setOpen(false)}>가격</a>
            <Button asChild size="sm" onClick={() => setOpen(false)}>
              <Link href="/signin">무료로 시작하기</Link>
            </Button>
          </div>
        </div>
      )}
    </header>
  )
}
