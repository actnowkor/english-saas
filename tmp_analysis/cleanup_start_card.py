import pathlib

path = pathlib.Path(r"c:/actnow-coding/english-learning-app/components/dashboard/start-learning-card.tsx")
text = path.read_text(encoding="utf-8")
needle = "\n\n  can_start: boolean\n  reason: \"OK_WITH_PRO\" | \"OK_WITH_FREE\" | \"NO_FREE_LEFT\" | string\n  pro_until?: string | null\n}\n\nconst toDbType"
if needle not in text:
  raise SystemExit("needle not found for cleanup")
text = text.replace(needle, "\n\nconst toDbType")
path.write_text(text, encoding="utf-8")
