import pathlib

path = pathlib.Path(r"c:/actnow-coding/english-learning-app/components/dashboard/start-learning-card.tsx")
text = path.read_text(encoding="utf-8")
text = text.replace('import { Button } from "@/components/ui/button"`r`nimport { Badge } from "@/components/ui/badge"', 'import { Button } from "@/components/ui/button"\nimport { Badge } from "@/components/ui/badge"')
text = text.replace('import { SessionTypeModal } from "@/components/dashboard/session-type-modal"`r`nimport type { AccessSummary } from "@/lib/payments/access-summary"', 'import { SessionTypeModal } from "@/components/dashboard/session-type-modal"\nimport type { AccessSummary } from "@/lib/payments/access-summary"')
path.write_text(text, encoding="utf-8")
