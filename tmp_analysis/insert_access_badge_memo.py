import pathlib

path = pathlib.Path(r"c:/actnow-coding/english-learning-app/components/dashboard/start-learning-card.tsx")
text = path.read_text(encoding="utf-8")
insertion = "\n  const accessBadge = useMemo(() => buildAccessBadge(accessSummary), [accessSummary])\n"
anchor = "  const [activeSid, setActiveSid] = useState<string | null>(null)\n"
if anchor not in text:
  raise SystemExit("anchor not found")
text = text.replace(anchor, anchor + insertion)
path.write_text(text, encoding="utf-8")
