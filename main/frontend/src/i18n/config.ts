// AENTRO Restaurant OS — i18n configuration.
// Foreign technical interns operate the staff app & line-check.
// Manager / SV / Admin assume Japanese (no i18n).

export const LOCALES = ["ja", "en", "vi", "ne", "my"] as const
export type Locale = (typeof LOCALES)[number]

export const DEFAULT_LOCALE: Locale = "ja"

export const LOCALE_LABELS: Record<Locale, string> = {
  ja: "日本語",
  en: "English",
  vi: "Tiếng Việt",
  ne: "नेपाली",
  my: "မြန်မာ",
}

export const LOCALE_FLAGS: Record<Locale, string> = {
  ja: "🇯🇵",
  en: "🇬🇧",
  vi: "🇻🇳",
  ne: "🇳🇵",
  my: "🇲🇲",
}

// Intl-friendly BCP-47 tags.
export const LOCALE_BCP47: Record<Locale, string> = {
  ja: "ja-JP",
  en: "en-US",
  vi: "vi-VN",
  ne: "ne-NP",
  my: "my-MM",
}

// Default currency per locale (ja=JPY for now; staff app records JPY).
export const LOCALE_CURRENCY: Record<Locale, string> = {
  ja: "JPY",
  en: "JPY",
  vi: "JPY",
  ne: "JPY",
  my: "JPY",
}

export const LOCALE_COOKIE = "NEXT_LOCALE"

export function isLocale(x: string | null | undefined): x is Locale {
  return !!x && (LOCALES as readonly string[]).includes(x)
}

// Detect best locale from an Accept-Language string.
// Falls back to DEFAULT_LOCALE.
export function pickFromAcceptLanguage(header: string | null | undefined): Locale {
  if (!header) return DEFAULT_LOCALE
  const tags = header.split(",").map((t) => {
    const [tag, q] = t.trim().split(";q=")
    return { tag: tag.toLowerCase(), q: q ? Number(q) : 1 }
  }).sort((a, b) => b.q - a.q)
  for (const { tag } of tags) {
    const base = tag.split("-")[0]
    if (isLocale(base)) return base
  }
  return DEFAULT_LOCALE
}
