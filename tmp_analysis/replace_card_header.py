import pathlib
import re

path = pathlib.Path(r"c:/actnow-coding/english-learning-app/components/dashboard/start-learning-card.tsx")
text = path.read_text(encoding="utf-8")
pattern = re.compile(r"<CardHeader className=\"pb-2\">.*?</CardHeader>", re.S)
replacement = """<CardHeader className=\"pb-2\">
        <div className=\"flex flex-wrap items-center justify-between gap-3\">
          <CardTitle className=\"flex items-center gap-2\">
            <Play className=\"h-5 w-5\" />
            학습 시작
          </CardTitle>
          {accessBadge ? (
            <Badge variant={accessBadge.variant} className=\"font-medium\">
              {accessBadge.label}
            </Badge>
          ) : null}
        </div>
        <CardDescription>
          학습을 위한 기본 조건이 모두 준비되었습니다.
          {disabledWeakSession ? " (취약 유형 세션은 아직 비활성 상태입니다)" : ""}
        </CardDescription>
      </CardHeader>"""
new_text, count = pattern.subn(replacement, text, count=1)
if count == 0:
  raise SystemExit("CardHeader block not replaced")
path.write_text(new_text, encoding="utf-8")
