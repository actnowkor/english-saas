// ê²½ë¡œ: lib/payments/payapp-client.ts
// ??• : PayApp REST API ?¸ì¶œ ë°??˜ê²½ ë³€??ê²€ì¦?? í‹¸ ?œê³µ
// ?˜ì¡´ê´€ê³? node fetch
// ?¬í•¨ ?¨ìˆ˜: getPayAppConfig(), requestPayApp(), verifyLinkval()

type PayAppConfig = {
  apiBase: string
  userId: string
  linkKey: string
  linkVal: string
  feedbackUrl: string
  returnUrl?: string
}

type PayAppResponse = {
  state?: number
  message?: string
  payurl?: string
  mul_no?: string
  [key: string]: unknown
}

function ensureEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`${name} ?˜ê²½ ë³€?˜ê? ?¤ì •?˜ì–´ ?ˆì? ?ŠìŠµ?ˆë‹¤.`)
  }
  return value
}

export function getPayAppConfig(): PayAppConfig {
  const apiBase = ensureEnv("PAYAPP_API_BASE")
  const userId = ensureEnv("PAYAPP_USER_ID")
  const linkKey = ensureEnv("PAYAPP_LINKKEY")
  const linkVal = ensureEnv("PAYAPP_LINKVAL")
  const feedbackUrl = ensureEnv("PAYAPP_FEEDBACK_URL")
  const returnUrl = process.env.PAYAPP_RETURN_URL || undefined

  return { apiBase, userId, linkKey, linkVal, feedbackUrl, returnUrl }
}

export async function requestPayApp(params: Record<string, string>) {
  const config = getPayAppConfig()
  const search = new URLSearchParams({
    userid: config.userId,
    linkkey: config.linkKey,
    ...params,
  })

  const response = await fetch(config.apiBase, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: search.toString(),
  })

  if (!response.ok) {
    throw new Error(`PayApp API ?¸ì¶œ ?¤íŒ¨ (status: ${response.status})`)
  }

  const text = await response.text()
  let parsed: PayAppResponse
  try {
    parsed = JSON.parse(text)
  } catch {
    const form = new URLSearchParams(text)
    parsed = Object.fromEntries(form.entries())
  }

  return parsed
}

export function verifyLinkval(payload: Record<string, any>) {
  const { linkVal } = getPayAppConfig()
  return payload.linkval === linkVal
}
