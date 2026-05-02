import { NextRequest, NextResponse } from "next/server"
import { LOCALE_COOKIE, isLocale, pickFromAcceptLanguage } from "@/i18n/config"

// Resolves the visitor's locale once and ensures the NEXT_LOCALE cookie is set.
// We DO NOT prefix routes with the locale (the staff app keeps /staff/* paths)
// — instead the I18nProvider reads the cookie / Accept-Language on hydration.
//
// Manager / SV / Admin pages render the same locale infrastructure but always
// fall back to ja if the user hasn't switched.
export function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const cookieLocale = req.cookies.get(LOCALE_COOKIE)?.value
  if (isLocale(cookieLocale)) {
    res.headers.set("x-aentro-locale", cookieLocale)
    return res
  }
  const detected = pickFromAcceptLanguage(req.headers.get("accept-language"))
  res.cookies.set(LOCALE_COOKIE, detected, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  })
  res.headers.set("x-aentro-locale", detected)
  return res
}

export const config = {
  // Skip Next internals / static / api / sw.
  matcher: ["/((?!_next/|api/|sw\\.js|favicon|.*\\.(?:png|jpg|jpeg|svg|ico|webmanifest|json|js|css|woff2?)).*)"],
}
