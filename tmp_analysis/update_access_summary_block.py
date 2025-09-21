import pathlib

path = pathlib.Path(r"c:/actnow-coding/english-learning-app/lib/payments/access-summary.ts")
text = path.read_text(encoding="utf-8")
old_block = "  if (entitlement) {\n    const now = Date.now()\n    const startAt = new Date(entitlement.start_at)\n    const endAt = new Date(entitlement.end_at)\n    const withinWindow = startAt.getTime() <= now && endAt.getTime() > now\n\n    proUntil = entitlement.end_at\n    paymentId = entitlement.payment_id\n\n    if (entitlement.is_active && withinWindow) {\n      status = \"pro\"\n    } else if (endAt.getTime() > now) {\n      status = \"expired\"\n    }\n\n    const payment = entitlement.payments\n    if (status === \"pro\" && payment?.status === \"paid\" && payment?.paid_at) {\n      const paidAt = new Date(payment.paid_at)\n      const diff = Date.now() - paidAt.getTime()\n      if (diff <= THREE_DAYS_MS) {\n        canCancel = true\n        cancelDeadline = new Date(paidAt.getTime() + THREE_DAYS_MS).toISOString()\n      }\n    }\n  }\n"
new_block = "  if (entitlement) {\n    const now = Date.now()\n    const startAt = new Date(entitlement.start_at)\n    const endAt = new Date(entitlement.end_at)\n    const withinWindow = startAt.getTime() <= now && endAt.getTime() > now\n\n    proUntil = entitlement.end_at\n    paymentId = entitlement.payment_id\n    status = \"expired\"\n\n    if (entitlement.is_active && withinWindow) {\n      status = \"pro\"\n    }\n\n    const payment = entitlement.payments\n    if (status === \"pro\" && payment?.status === \"paid\" && payment?.paid_at) {\n      const paidAt = new Date(payment.paid_at)\n      const diff = Date.now() - paidAt.getTime()\n      if (diff <= THREE_DAYS_MS) {\n        canCancel = true\n        cancelDeadline = new Date(paidAt.getTime() + THREE_DAYS_MS).toISOString()\n      }\n    }\n  }\n"
if old_block not in text:
  raise SystemExit("target block not found in access-summary")
text = text.replace(old_block, new_block)
path.write_text(text, encoding="utf-8")
