"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertTriangle, RefreshCw } from "lucide-react"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="ko">
      <body>
        <div className="min-h-screen flex items-center justify-center bg-muted/50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-destructive" />
              </div>
              <CardTitle className="text-xl">심각한 오류가 발생했습니다</CardTitle>
              <CardDescription>
                애플리케이션에서 예상치 못한 오류가 발생했습니다. 페이지를 새로고침하거나 잠시 후 다시 시도해주세요.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {process.env.NODE_ENV === "development" && (
                <div className="bg-muted p-3 rounded text-sm">
                  <p className="font-medium text-destructive mb-1">개발 모드 오류 정보:</p>
                  <p className="text-xs text-muted-foreground">{error.message}</p>
                  {error.digest && <p className="text-xs text-muted-foreground">Digest: {error.digest}</p>}
                </div>
              )}
              <div className="flex gap-2">
                <Button onClick={reset} className="flex-1">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  다시 시도
                </Button>
                <Button variant="outline" onClick={() => window.location.reload()} className="flex-1">
                  페이지 새로고침
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </body>
    </html>
  )
}
