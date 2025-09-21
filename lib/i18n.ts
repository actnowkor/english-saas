import ko from "../locales/ko.json"

type TranslationKey = string
type TranslationValue = string | { [key: string]: TranslationValue }

const translations = {
  ko,
}

export type Locale = keyof typeof translations

export function getTranslation(locale: Locale, key: TranslationKey): string {
  const keys = key.split(".")
  let value: TranslationValue = translations[locale]

  for (const k of keys) {
    if (typeof value === "object" && value !== null && k in value) {
      value = value[k]
    } else {
      return key // Return key if translation not found
    }
  }

  return typeof value === "string" ? value : key
}

export function useTranslation(locale: Locale = "ko") {
  return {
    t: (key: TranslationKey, params?: Record<string, string | number>) => {
      let translation = getTranslation(locale, key)

      if (params) {
        Object.entries(params).forEach(([param, value]) => {
          translation = translation.replace(`{${param}}`, String(value))
        })
      }

      return translation
    },
  }
}
