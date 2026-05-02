"use client"

// Line-check is the cross-cutting checklist tool used by staff. Wrap it in the
// same i18n provider so non-Japanese trainees can run a check end-to-end.
import { I18nProvider } from "@/i18n/I18nProvider"

export default function LineCheckLayout({ children }: { children: React.ReactNode }) {
  return <I18nProvider>{children}</I18nProvider>
}
