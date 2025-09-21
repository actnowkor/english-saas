"use client"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { useTranslation } from "@/lib/i18n"
import { LayoutDashboard, BookOpen, History, Settings, Shield, X } from "lucide-react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useSidebar } from "@/hooks/use-sidebar"
import { useEffect } from "react"

interface SidebarProps {
  userRole?: "user" | "admin"
}

export function Sidebar({ userRole = "user" }: SidebarProps) {
  const { t } = useTranslation()
  const pathname = usePathname()
  const router = useRouter()
  const { isOpen, close } = useSidebar()

  const navigation = [
    {
      name: t("dashboard.title"),
      href: "/dashboard",
      icon: LayoutDashboard,
      current: pathname === "/dashboard",
    },
    {
      name: "학습",
      href: "/learn",
      icon: BookOpen,
      current: pathname === "/learn",
    },
    {
      name: t("history.title"),
      href: "/history",
      icon: History,
      current: pathname.startsWith("/history"),
    },
    {
      name: t("settings.title"),
      href: "/settings",
      icon: Settings,
      current: pathname === "/settings",
    },
  ]

  if (userRole === "admin") {
    navigation.push({
      name: "문제 관리",
      href: "/admin/problems",
      icon: Shield,
      current: pathname.startsWith("/admin"),
    })
  }

  useEffect(() => {
    close()
  }, [pathname, close])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        close()
      }
    }

    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown)
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown)
      document.body.style.overflow = ""
    }
  }, [isOpen, close])

  return (
    <>
      {isOpen && <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={close} aria-hidden="true" />}

      <div
        id="sidebar"
        className={cn(
          "flex h-full w-64 flex-col bg-sidebar transition-transform duration-200 ease-in-out",
          "lg:translate-x-0 lg:static lg:z-auto",
          "fixed inset-y-0 left-0 z-50",
          isOpen ? "translate-x-0" : "-translate-x-full",
        )}
        aria-expanded={isOpen}
      >
        <div className="flex items-center justify-between p-4 lg:hidden">
          <span className="font-semibold text-sidebar-foreground">메뉴</span>
          <Button variant="ghost" size="sm" onClick={close} aria-label="Close sidebar">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex flex-col gap-2 p-4">
          <nav className="grid gap-1">
            {navigation.map((item) => {
              const Icon = item.icon
              return (
                <Button
                  key={item.name}
                  variant={item.current ? "secondary" : "ghost"}
                  className={cn(
                    "w-full justify-start",
                    item.current && "bg-sidebar-accent text-sidebar-accent-foreground",
                  )}
                  asChild
                >
                  <Link href={item.href}>
                    <Icon className="mr-2 h-4 w-4" />
                    {item.name}
                  </Link>
                </Button>
              )
            })}
          </nav>
        </div>
      </div>
    </>
  )
}
