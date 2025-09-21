import type React from "react"
import type { Metadata } from "next"
import { Noto_Sans_KR } from "next/font/google"
import { GeistMono } from "geist/font/mono"
import { Analytics } from "@vercel/analytics/next"
import { Toaster } from "@/components/ui/toaster"
import { Suspense } from "react"
import { AuthProvider } from "@/hooks/use-auth"
import { ErrorBoundary } from "@/components/error-boundary"
import { FullPageLoader } from "@/components/loading-spinner"
import "./globals.css"

const notoSansKr = Noto_Sans_KR({
  subsets: ["latin"],
  weight: ["400", "500", "700", "900"],
  display: "swap",
  variable: "--font-noto-sans",
})

export const metadata: Metadata = {
  title: "EnglishLab - 영어 학습 플랫폼",
  description: "효과적인 영어 학습을 위한 스마트 플랫폼",
  generator: "v0.app",
  keywords: ["영어학습", "English", "교육", "SRS", "spaced repetition"],
  authors: [{ name: "EnglishLab Team" }],
  viewport: "width=device-width, initial-scale=1",
  themeColor: "#000000",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ko">
      <body className={`font-sans ${notoSansKr.variable} ${GeistMono.variable}`}>
        <ErrorBoundary>
          <AuthProvider>
            <Suspense fallback={<FullPageLoader />}>
              {children}
              <Toaster />
              <Analytics />
            </Suspense>
          </AuthProvider>
        </ErrorBoundary>
      </body>
    </html>
  )
}
