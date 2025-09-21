import pathlib

path = pathlib.Path(r"c:/actnow-coding/english-learning-app/components/layout/header.tsx")
text = path.read_text(encoding="utf-8")
old = "                <DropdownMenuItem onClick={signOut}>\n                  <LogOut className=\"mr-2 h-4 w-4\" />\n                  <span>{t(\"settings.logout\")}</span>\n                </DropdownMenuItem>"
new = "                <DropdownMenuItem\n                  onClick={async () => {\n                    await signOut()\n                    router.push(\"/\")\n                  }}\n                >\n                  <LogOut className=\"mr-2 h-4 w-4\" />\n                  <span>{t(\"settings.logout\")}</span>\n                </DropdownMenuItem>"
if old not in text:
  raise SystemExit("logout block not found")
text = text.replace(old, new)
path.write_text(text, encoding="utf-8")
