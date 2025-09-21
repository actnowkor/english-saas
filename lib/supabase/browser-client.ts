// lib/supabase/browser-client.ts
"use client"

import { createBrowserClient } from "@supabase/ssr"

// .env.local 에 아래 두 개가 정확히 있어야 함
// NEXT_PUBLIC_SUPABASE_URL=https://<같은 ref>.supabase.co
// NEXT_PUBLIC_SUPABASE_ANON_KEY=xxxx

export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)
