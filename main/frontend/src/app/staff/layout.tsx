"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, Clock, ClipboardCheck, Trash2, MessageSquare, GraduationCap, Settings } from "lucide-react"
import { cn } from "@/lib/utils"
import { PWAHead } from "@/components/common/PWAHead"
import { InstallPrompt } from "@/components/common/InstallPrompt"
import { AppErrorBoundary } from "@/components/common/AppErrorBoundary"
import { SentryUserBinder } from "@/components/common/SentryUserBinder"
import { SkipLink } from "@/components/common/SkipLink"
import { ToastProvider } from "@/components/common/Toast"
import { NetworkBanner } from "@/components/common/NetworkBanner"
import { RoleGuard } from "@/components/auth/RoleGuard"
import { StoreSwitcher } from "@/components/auth/StoreSwitcher"
import { OnboardingOverlay } from "@/components/onboarding/OnboardingOverlay"
import { HelpButton } from "@/components/common/HelpButton"
import { ConsentGate } from "@/components/consent/ConsentDialog"
import { I18nProvider, useTranslations } from "@/i18n/I18nProvider"
import { LanguageSwitcher } from "@/components/i18n/LanguageSwitcher"

export default function StaffLayout({ children }: { children: React.ReactNode }) {
  return (
    <I18nProvider>
      <StaffShell>{children}</StaffShell>
    </I18nProvider>
  )
}

function StaffShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const tNav = useTranslations("nav")
  const tCommon = useTranslations("common")
  const tabs: { href: string; icon: any; label: string; onb?: string }[] = [
    { href: "/staff", icon: Home, label: tNav("home") },
    { href: "/staff/clock", icon: Clock, label: tNav("clock"), onb: "staff-clock" },
    { href: "/staff/checklist", icon: ClipboardCheck, label: tNav("checklist"), onb: "staff-checklist" },
    { href: "/staff/loss", icon: Trash2, label: tNav("loss"), onb: "staff-loss" },
    { href: "/staff/voice", icon: MessageSquare, label: tNav("voice") },
    { href: "/staff/training", icon: GraduationCap, label: tNav("training"), onb: "staff-emergency" },
    { href: "/staff/settings", icon: Settings, label: tNav("settings"), onb: "staff-settings" },
  ]

  return (
    <RoleGuard allow={["staff"]}>
    <ToastProvider>
    <div className="fixed inset-0 z-50 bg-[#0a0e14] text-white overflow-hidden flex flex-col relative">
      <PWAHead role="staff" />
      <SentryUserBinder role="staff" />
      <SkipLink />
      <NetworkBanner />
      <header className="shrink-0 bg-[#0d1117] border-b border-white/10 px-4 py-3 flex items-center justify-between" role="banner">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center font-bold text-sm" aria-hidden="true">
            A
          </div>
          <div className="text-sm font-semibold">{tCommon("appName")}</div>
        </div>
        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          <StoreSwitcher compact />
          <Link
            href="/"
            aria-label={tNav("toBusinessOS")}
            className="text-xs text-white/60 hover:text-white px-2 py-1 rounded hover:bg-white/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0d1117]"
          >
            {tNav("toBusinessOS")}
          </Link>
        </div>
      </header>

      <main id="main" role="main" className="flex-1 overflow-y-auto pb-24">
        <AppErrorBoundary role="staff">
          <ConsentGate>{children}</ConsentGate>
        </AppErrorBoundary>
      </main>

      <nav
        aria-label={tCommon("appName")}
        className="absolute bottom-0 left-0 right-0 bg-[#0d1117] border-t border-white/10 z-10"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="grid grid-cols-7">
          {tabs.map((t) => {
            const active =
              t.href === "/staff" ? pathname === "/staff" : pathname.startsWith(t.href)
            const Icon = t.icon
            return (
              <Link
                key={t.href}
                href={t.href}
                aria-label={t.label}
                aria-current={active ? "page" : undefined}
                data-onboarding={t.onb}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 py-2.5 min-h-[64px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-inset",
                  active ? "text-emerald-300" : "text-white/70 hover:text-white",
                )}
              >
                <Icon className="h-5 w-5" aria-hidden="true" />
                <span className="text-[10px] font-medium leading-none">{t.label}</span>
              </Link>
            )
          })}
        </div>
      </nav>

      <InstallPrompt role="staff" appLabel={tCommon("appName")} />
      <OnboardingOverlay role="staff" />
      <HelpButton />
    </div>
    </ToastProvider>
    </RoleGuard>
  )
}
