import pathlib
import re

path = pathlib.Path(r"c:/actnow-coding/english-learning-app/app/api/dashboard/route.ts")
text = path.read_text(encoding="utf-8")
pattern = re.compile(
    r"      difficulty: {\n        applied: false,\n        reason: (\".*?\"),\n        applied_mix: null,\n      },\n    }\)"
)

def replacer(match: re.Match) -> str:
  reason = match.group(1)
  return (
    "      difficulty: {\n"
    "        applied: false,\n"
    f"        reason: {reason},\n"
    "        applied_mix: null,\n"
    "      },\n"
    "      access: EMPTY_ACCESS,\n"
    "      free_sessions_left: EMPTY_ACCESS.free_sessions_left,\n"
    "      pro_until: EMPTY_ACCESS.pro_until,\n"
    "    })"
  )

new_text, count = pattern.subn(replacer, text)
if count == 0:
  raise SystemExit("pattern not replaced")
path.write_text(new_text, encoding="utf-8")
