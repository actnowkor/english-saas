// 경로: app/api/settings/profile/route.ts
// 역할: 사용자 프로필(표시 이름) 업데이트

import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server-client"

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: auth } = await supabase.auth.getUser()
  const user = auth?.user
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json()
    const display_name = String(body?.display_name ?? '').trim()
    if (!display_name) return NextResponse.json({ error: 'invalid display_name' }, { status: 400 })

    const { error } = await supabase
      .from('users')
      .update({ display_name })
      .eq('id', user.id)

    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    console.error('[POST /api/settings/profile] ', e?.message || e)
    return NextResponse.json({ error: e?.message ?? 'server error' }, { status: 500 })
  }
}

