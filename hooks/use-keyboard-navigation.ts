"use client"

import { useEffect } from "react"

interface UseKeyboardNavigationProps {
  onEnter?: () => void
  onEscape?: () => void
  onArrowUp?: () => void
  onArrowDown?: () => void
  onArrowLeft?: () => void
  onArrowRight?: () => void
  enabled?: boolean
}

export function useKeyboardNavigation({
  onEnter,
  onEscape,
  onArrowUp,
  onArrowDown,
  onArrowLeft,
  onArrowRight,
  enabled = true,
}: UseKeyboardNavigationProps) {
  useEffect(() => {
    if (!enabled) return

    const handleKeyDown = (event: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return
      }

      switch (event.key) {
        case "Enter":
          event.preventDefault()
          onEnter?.()
          break
        case "Escape":
          event.preventDefault()
          onEscape?.()
          break
        case "ArrowUp":
          event.preventDefault()
          onArrowUp?.()
          break
        case "ArrowDown":
          event.preventDefault()
          onArrowDown?.()
          break
        case "ArrowLeft":
          event.preventDefault()
          onArrowLeft?.()
          break
        case "ArrowRight":
          event.preventDefault()
          onArrowRight?.()
          break
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [enabled, onEnter, onEscape, onArrowUp, onArrowDown, onArrowLeft, onArrowRight])
}
