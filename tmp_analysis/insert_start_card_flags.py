import pathlib

path = pathlib.Path(r"c:/actnow-coding/english-learning-app/components/dashboard/start-learning-card.tsx")
text = path.read_text(encoding="utf-8")
anchor = "  const accessBadge = useMemo(() => buildAccessBadge(accessSummary), [accessSummary])\n"
insertion = "  const showExpiredNotice = accessSummary?.status === \"expired\"\n  const showQuotaNotice = !showExpiredNotice && accessSummary && accessSummary.status !== \"pro\" && accessSummary.free_sessions_left === 0\n"
if anchor not in text:
  raise SystemExit("anchor for notice flags not found")
text = text.replace(anchor, anchor + insertion)
path.write_text(text, encoding="utf-8")
