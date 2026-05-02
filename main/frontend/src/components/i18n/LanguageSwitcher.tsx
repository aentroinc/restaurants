"use client"

import { useState } from "react"
import { Globe, Check } from "lucide-react"
import {
  LOCALES,
  LOCALE_LABELS,
  LOCALE_FLAGS,
  type Locale,
} from "@/i18n/config"
import { useLocale, useSetLocale, useTranslations } from "@/i18n/I18nProvider"

interface Props {
  variant?: "header" | "inline"
}

export function LanguageSwitcher({ variant = "header" }: Props) {
  const locale = useLocale()
  const setLocale = useSetLocale()
  const t = useTranslations("languageSwitcher")
  const [open, setOpen] = useState(false)

  if (variant === "inline") {
    return (
      <div className="grid grid-cols-1 gap-2">
        {LOCALES.map((l) => (
          <button
            key={l}
            onClick={() => setLocale(l)}
            className={
              "w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-colors min-h-[56px] " +
              (l === locale
                ? "border-emerald-400 bg-emerald-500/15 text-emerald-100"
                : "border-white/10 bg-white/[0.03] text-white/80 hover:bg-white/[0.06]")
            }
          >
            <span className="flex items-center gap-3 text-base">
              <span className="text-xl">{LOCALE_FLAGS[l]}</span>
              <span>{LOCALE_LABELS[l]}</span>
            </span>
            {l === locale && <Check className="h-5 w-5 text-emerald-400" />}
          </button>
        ))}
      </div>
    )
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={t("label")}
        className="flex items-center gap-1.5 px-2 py-1 rounded-md text-xs text-white/60 hover:text-white hover:bg-white/[0.06]"
      >
        <Globe className="h-3.5 w-3.5" />
        <span className="text-base leading-none">{LOCALE_FLAGS[locale]}</span>
        <span className="hidden sm:inline">{LOCALE_LABELS[locale]}</span>
      </button>
      {open && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <div className="absolute right-0 mt-1 z-50 min-w-[180px] rounded-xl border border-white/10 bg-[#0d1117] shadow-xl overflow-hidden">
            <div className="px-3 py-2 text-[10px] uppercase tracking-wider text-white/40 border-b border-white/5">
              {t("current")}
            </div>
            <ul className="py-1">
              {LOCALES.map((l: Locale) => (
                <li key={l}>
                  <button
                    onClick={() => {
                      setLocale(l)
                      setOpen(false)
                    }}
                    className={
                      "w-full flex items-center justify-between px-3 py-2.5 text-sm hover:bg-white/[0.06] " +
                      (l === locale ? "text-emerald-300" : "text-white/80")
                    }
                  >
                    <span className="flex items-center gap-2">
                      <span className="text-base leading-none">{LOCALE_FLAGS[l]}</span>
                      <span>{LOCALE_LABELS[l]}</span>
                    </span>
                    {l === locale && <Check className="h-4 w-4" />}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  )
}
