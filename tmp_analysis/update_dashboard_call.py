import pathlib

path = pathlib.Path(r"c:/actnow-coding/english-learning-app/app/dashboard/page.tsx")
text = path.read_text(encoding="utf-8")
old = "            <StartLearningCard\n              disabledWeakSession={!gates.weakSessionEnabled}\n              difficultyNotice={difficulty ? { applied: difficulty.applied, reason: difficulty.reason } : undefined}\n            />"
new = "            <StartLearningCard\n              disabledWeakSession={!gates.weakSessionEnabled}\n              difficultyNotice={difficulty ? { applied: difficulty.applied, reason: difficulty.reason } : undefined}\n              accessSummary={data.access}\n            />"
if old not in text:
  raise SystemExit("target snippet not found")
text = text.replace(old, new)
path.write_text(text, encoding="utf-8")
