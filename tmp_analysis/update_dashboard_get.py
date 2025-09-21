import pathlib

path = pathlib.Path(r"c:/actnow-coding/english-learning-app/app/api/dashboard/route.ts")
text = path.read_text(encoding="utf-8")

text = text.replace(
"  try {\n    const now = new Date()\n",
"  try {\n    const service = createServiceClient()\n    let accessSummary = EMPTY_ACCESS\n    try {\n      accessSummary = await loadAccessSummary(service, user.id)\n    } catch (accessError) {\n      console.warn(\"[GET /api/dashboard] access summary failed\", (accessError as any)?.message || accessError)\n    }\n\n    const now = new Date()\n"
)

text = text.replace(
"      difficulty,\n    }\n\n    return NextResponse.json(payload)\n",
"      difficulty,\n      access: accessSummary,\n      free_sessions_left: accessSummary.free_sessions_left,\n      pro_until: accessSummary.pro_until,\n    }\n\n    return NextResponse.json(payload)\n"
)

text = text.replace(
"      difficulty: {\n        applied: false,\n        reason: \"������ ����\",\n        applied_mix: null,\n      },\n    })\n",
"      difficulty: {\n        applied: false,\n        reason: \"������ ����\",\n        applied_mix: null,\n      },\n      access: EMPTY_ACCESS,\n      free_sessions_left: EMPTY_ACCESS.free_sessions_left,\n      pro_until: EMPTY_ACCESS.pro_until,\n    })\n"
)

path.write_text(text, encoding="utf-8")
