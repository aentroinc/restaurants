"use client"

// Lightweight i18n provider for AENTRO frontline apps.
// Pattern is intentionally compatible with `next-intl`'s useTranslations() API
// (t("nested.key", { var }) and t.raw for arrays/objects), so we can swap in
// next-intl later without touching call sites.

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"
import {
  DEFAULT_LOCALE,
  LOCALES,
  LOCALE_BCP47,
  LOCALE_COOKIE,
  isLocale,
  type Locale,
} from "./config"

import ja from "./messages/ja.json"
import en from "./messages/en.json"
import vi from "./messages/vi.json"
import ne from "./messages/ne.json"
import my from "./messages/my.json"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const DICTIONARIES: Record<Locale, any> = { ja, en, vi, ne, my }

interface I18nContextValue {
  locale: Locale
  setLocale: (l: Locale) => void
  bcp47: string
}

const I18nContext = createContext<I18nContextValue>({
  locale: DEFAULT_LOCALE,
  setLocale: () => {},
  bcp47: LOCALE_BCP47[DEFAULT_LOCALE],
})

function readCookieLocale(): Locale | null {
  if (typeof document === "undefined") return null
  const m = document.cookie.match(new RegExp("(?:^|; )" + LOCALE_COOKIE + "=([^;]+)"))
  if (m && isLocale(decodeURIComponent(m[1]))) return decodeURIComponent(m[1]) as Locale
  return null
}

function readNavigatorLocale(): Locale | null {
  if (typeof navigator === "undefined") return null
  const langs = navigator.languages?.length ? navigator.languages : [navigator.language]
  for (const l of langs) {
    const base = l.toLowerCase().split("-")[0]
    if (isLocale(base)) return base
  }
  return null
}

function persistLocale(l: Locale) {
  if (typeof document === "undefined") return
  // 1 year, root path. Picked up by middleware.ts on next navigation.
  document.cookie = `${LOCALE_COOKIE}=${l}; path=/; max-age=${60 * 60 * 24 * 365}`
}

export function I18nProvider({
  initialLocale,
  children,
}: {
  initialLocale?: Locale
  children: React.ReactNode
}) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale ?? DEFAULT_LOCALE)

  // Hydrate from cookie / navigator on first client mount when no SSR locale.
  useEffect(() => {
    if (initialLocale) return
    const cookieLocale = readCookieLocale()
    if (cookieLocale) {
      setLocaleState(cookieLocale)
      return
    }
    const navLocale = readNavigatorLocale()
    if (navLocale) {
      setLocaleState(navLocale)
      persistLocale(navLocale)
    }
  }, [initialLocale])

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l)
    persistLocale(l)
    if (typeof document !== "undefined") {
      document.documentElement.lang = l
    }
  }, [])

  const value = useMemo<I18nContextValue>(
    () => ({ locale, setLocale, bcp47: LOCALE_BCP47[locale] }),
    [locale, setLocale],
  )

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useLocale(): Locale {
  return useContext(I18nContext).locale
}

export function useSetLocale() {
  return useContext(I18nContext).setLocale
}

export function useBcp47(): string {
  return useContext(I18nContext).bcp47
}

// Resolve a key like "home.greeting" within a dictionary.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function resolve(dict: any, key: string): any {
  const parts = key.split(".")
  let cur = dict
  for (const p of parts) {
    if (cur == null) return undefined
    cur = cur[p]
  }
  return cur
}

// Replace {var} placeholders with values from `vars`.
function interpolate(s: string, vars?: Record<string, string | number>): string {
  if (!vars) return s
  return s.replace(/\{(\w+)\}/g, (_, k) => (k in vars ? String(vars[k]) : `{${k}}`))
}

export interface Translator {
  (key: string, vars?: Record<string, string | number>): string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  raw(key: string): any
  has(key: string): boolean
}

export function useTranslations(namespace?: string): Translator {
  const locale = useLocale()
  const dict = DICTIONARIES[locale] || DICTIONARIES[DEFAULT_LOCALE]
  const fallback = DICTIONARIES[DEFAULT_LOCALE]

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>) => {
      const fullKey = namespace ? `${namespace}.${key}` : key
      let v = resolve(dict, fullKey)
      if (v === undefined || v === null) {
        v = resolve(fallback, fullKey)
      }
      if (typeof v !== "string") {
        // Surface missing-key errors loudly in dev.
        if (process.env.NODE_ENV !== "production") {
          // eslint-disable-next-line no-console
          console.warn(`[i18n] missing string for key '${fullKey}' in locale '${locale}'`)
        }
        return fullKey
      }
      return interpolate(v, vars)
    },
    [dict, fallback, locale, namespace],
  )

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const raw = useCallback(
    (key: string) => {
      const fullKey = namespace ? `${namespace}.${key}` : key
      const v = resolve(dict, fullKey)
      if (v === undefined || v === null) return resolve(fallback, fullKey)
      return v
    },
    [dict, fallback, namespace],
  )

  const has = useCallback(
    (key: string) => {
      const fullKey = namespace ? `${namespace}.${key}` : key
      return resolve(dict, fullKey) !== undefined || resolve(fallback, fullKey) !== undefined
    },
    [dict, fallback, namespace],
  )

  // Cast to the callable interface.
  const fn = t as Translator
  fn.raw = raw
  fn.has = has
  return fn
}

// Test helper: walk every key in ja.json and verify presence in every other
// dictionary. Used by /api or unit tests to detect missing strings.
export function findMissingKeys(): Record<Locale, string[]> {
  const result: Record<Locale, string[]> = { ja: [], en: [], vi: [], ne: [], my: [] }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function walk(node: any, path: string[]) {
    if (node && typeof node === "object" && !Array.isArray(node)) {
      for (const k of Object.keys(node)) walk(node[k], [...path, k])
    } else {
      const key = path.join(".")
      for (const l of LOCALES) {
        if (l === "ja") continue
        if (resolve(DICTIONARIES[l], key) === undefined) {
          result[l].push(key)
        }
      }
    }
  }
  walk(DICTIONARIES.ja, [])
  return result
}
