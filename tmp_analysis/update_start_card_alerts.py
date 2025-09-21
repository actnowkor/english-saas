import pathlib

path = pathlib.Path(r"c:/actnow-coding/english-learning-app/components/dashboard/start-learning-card.tsx")
text = path.read_text(encoding="utf-8")
anchor = "      <CardContent className=\"space-y-4\">\n        {guardMessage && (\n"
insertion = "      <CardContent className=\"space-y-4\">\n        {showExpiredNotice ? (\n          <Alert variant=\"destructive\">\n            <AlertDescription>이용권이 만료되었습니다. 설정 화면에서 이용권을 다시 활성화해 주세요.</AlertDescription>\n          </Alert>\n        ) : null}\n        {!showExpiredNotice && showQuotaNotice ? (\n          <Alert variant=\"destructive\">\n            <AlertDescription>오늘 무료 학습 횟수를 모두 사용했습니다. 이용권을 구매하면 바로 학습을 이어갈 수 있어요.</AlertDescription>\n          </Alert>\n        ) : null}\n        {guardMessage && (\n"
if anchor not in text:
  raise SystemExit("CardContent anchor not found")
text = text.replace(anchor, insertion)
path.write_text(text, encoding="utf-8")
