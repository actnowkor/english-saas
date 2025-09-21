"use client"

import type React from "react"

import { Header } from "./header"
import { Sidebar } from "./sidebar"
import { OfflineIndicator } from "@/components/offline-indicator"
import { ErrorBoundary } from "@/components/error-boundary"
import { useAuth } from "@/hooks/use-auth"

interface AppLayoutProps {
  children: React.ReactNode
}

export function AppLayout({ children }: AppLayoutProps) {
  const { user, signOut } = useAuth()

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-background overflow-x-hidden">
        <OfflineIndicator />
        <Header user={user} onSignOut={signOut} />
        <div className="flex h-[calc(100vh-3.5rem)]">
          <Sidebar userRole={user?.role} />
          <main className="flex-1 overflow-auto p-4 lg:p-6 w-0">
            <ErrorBoundary>{children}</ErrorBoundary>
          </main>
        </div>
      </div>
    </ErrorBoundary>
  )
}