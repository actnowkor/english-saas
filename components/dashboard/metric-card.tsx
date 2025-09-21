// components/dashboard/metric-card.tsx
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export function MetricCard({
  title,
  value,
  tooltip,
}: {
  title: string
  value: number | string
  tooltip?: string
}) {
  return (
    <Card title={tooltip}>
      <CardHeader className="pb-2">
        <CardTitle>{title}</CardTitle>
        {tooltip && <CardDescription>{tooltip}</CardDescription>}
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold">{value}</div>
      </CardContent>
    </Card>
  )
}
