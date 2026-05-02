// Locale-aware number, currency, date, and time formatters.
// Keep wire-format ¥ values in JPY; only the *display* changes per locale.

import { LOCALE_BCP47, LOCALE_CURRENCY, type Locale } from "@/i18n/config"

export function formatNumber(value: number, locale: Locale, opts?: Intl.NumberFormatOptions): string {
  return new Intl.NumberFormat(LOCALE_BCP47[locale], opts).format(value)
}

// Always JPY for now (revenue is in yen). Locale only changes how it's rendered.
export function formatCurrency(value: number, locale: Locale, currency?: string): string {
  return new Intl.NumberFormat(LOCALE_BCP47[locale], {
    style: "currency",
    currency: currency || LOCALE_CURRENCY[locale],
    maximumFractionDigits: 0,
  }).format(value)
}

export function formatDate(
  value: Date | string,
  locale: Locale,
  opts?: Intl.DateTimeFormatOptions,
): string {
  const d = typeof value === "string" ? new Date(value) : value
  return new Intl.DateTimeFormat(LOCALE_BCP47[locale], opts || { dateStyle: "medium" }).format(d)
}

export function formatTime(
  value: Date | string,
  locale: Locale,
  opts?: Intl.DateTimeFormatOptions,
): string {
  const d = typeof value === "string" ? new Date(value) : value
  return new Intl.DateTimeFormat(LOCALE_BCP47[locale], opts || { hour: "2-digit", minute: "2-digit" }).format(d)
}

export function formatDateTime(value: Date | string, locale: Locale): string {
  const d = typeof value === "string" ? new Date(value) : value
  return new Intl.DateTimeFormat(LOCALE_BCP47[locale], {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(d)
}

// "Mon, October 31" style header used on the staff home greeting.
export function formatGreetingDate(value: Date, locale: Locale): string {
  return new Intl.DateTimeFormat(LOCALE_BCP47[locale], {
    month: "long",
    day: "numeric",
    weekday: "long",
  }).format(value)
}
