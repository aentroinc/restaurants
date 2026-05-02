"use client"

import { useEffect } from "react"

type Role = "staff" | "manager" | "sv"

const THEME: Record<Role, string> = {
  staff: "#1e3a8a",
  manager: "#10b981",
  sv: "#7c3aed",
}

/**
 * Client-side helper that:
 *   - swaps <link rel="manifest"> to the role-specific manifest
 *   - sets <meta name="theme-color"> / apple-mobile-web-app-* / viewport-fit
 *   - registers /sw.js once the page is interactive
 *   - injects an apple-touch-icon for the role
 */
export function PWAHead({ role }: { role: Role }) {
  useEffect(() => {
    if (typeof document === "undefined") return

    const set = (selector: string, attrs: Record<string, string>, tag: keyof HTMLElementTagNameMap = "meta") => {
      let el = document.head.querySelector(selector) as HTMLElement | null
      const created = !el
      if (!el) {
        el = document.createElement(tag)
        document.head.appendChild(el)
      }
      Object.entries(attrs).forEach(([k, v]) => el!.setAttribute(k, v))
      return { el, created }
    }

    // Manifest
    const manifestHref = `/manifest-${role}.json`
    const manifest = set(
      'link[rel="manifest"]',
      { rel: "manifest", href: manifestHref, "data-pwa-role": role },
      "link",
    )

    // Theme color
    const theme = set(
      'meta[name="theme-color"]',
      { name: "theme-color", content: THEME[role] },
    )

    // Viewport with viewport-fit=cover (notch support)
    set(
      'meta[name="viewport"]',
      { name: "viewport", content: "width=device-width,initial-scale=1,viewport-fit=cover,maximum-scale=1" },
    )

    // Apple PWA flags
    set('meta[name="apple-mobile-web-app-capable"]', { name: "apple-mobile-web-app-capable", content: "yes" })
    set('meta[name="mobile-web-app-capable"]', { name: "mobile-web-app-capable", content: "yes" })
    set(
      'meta[name="apple-mobile-web-app-status-bar-style"]',
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
    )
    set(
      'meta[name="apple-mobile-web-app-title"]',
      { name: "apple-mobile-web-app-title", content: role === "staff" ? "AENTRO 現場" : role === "manager" ? "AENTRO 店長" : "AENTRO SV" },
    )

    // Apple touch icon
    set(
      'link[rel="apple-touch-icon"]',
      { rel: "apple-touch-icon", href: `/icons/aentro-${role}.svg` },
      "link",
    )

    // Register service worker
    if ("serviceWorker" in navigator && process.env.NODE_ENV !== "development") {
      navigator.serviceWorker.register("/sw.js").catch(() => {})
    }

    return () => {
      // Restore default manifest if we created the role one
      if (manifest.created) manifest.el.remove()
      else manifest.el.setAttribute("href", "/manifest.json")
    }
  }, [role])

  return null
}
