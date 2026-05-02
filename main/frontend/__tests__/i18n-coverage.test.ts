/**
 * i18n coverage test — verifies every key in ja.json exists in all other
 * locale dictionaries. Catches missing-key regressions before they ship.
 *
 * Run: `node --import tsx __tests__/i18n-coverage.test.ts`
 */
import assert from "node:assert/strict"

import ja from "../src/i18n/messages/ja.json"
import en from "../src/i18n/messages/en.json"
import vi from "../src/i18n/messages/vi.json"
import ne from "../src/i18n/messages/ne.json"
import my from "../src/i18n/messages/my.json"
import { LOCALES, isLocale, pickFromAcceptLanguage, DEFAULT_LOCALE } from "../src/i18n/config"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const dicts: Record<string, any> = { ja, en, vi, ne, my }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function resolve(node: any, key: string): unknown {
  return key.split(".").reduce<unknown>((cur, p) => {
    if (cur == null || typeof cur !== "object") return undefined
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (cur as any)[p]
  }, node)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function walk(node: any, path: string[], visit: (key: string, value: unknown) => void) {
  if (node && typeof node === "object" && !Array.isArray(node)) {
    for (const k of Object.keys(node)) walk(node[k], [...path, k], visit)
  } else {
    visit(path.join("."), node)
  }
}

const keys: string[] = []
walk(ja, [], (k) => { if (!k.startsWith("_meta")) keys.push(k) })

let failures = 0

for (const locale of LOCALES) {
  if (locale === "ja") continue
  for (const k of keys) {
    const v = resolve(dicts[locale], k)
    if (v === undefined) {
      // eslint-disable-next-line no-console
      console.error(`[FAIL] ${locale} missing key: ${k}`)
      failures++
    }
  }
}

assert.equal(failures, 0, `Missing translation keys across non-ja locales: ${failures}`)

// Spot-check critical strings really do differ across locales (ie translation
// actually happened, not just a copy of ja).
const samples = [
  "emergency.scenarios.fire.title",
  "emergency.scenarios.anaphylaxis.steps.0",
  "clock.title",
  "loss.title",
]
for (const k of samples) {
  const jaVal = resolve(ja, k) as string
  for (const l of ["en", "vi", "ne", "my"] as const) {
    const v = resolve(dicts[l], k) as string
    assert.notEqual(v, jaVal, `${l} value for "${k}" is identical to ja — translation likely missing`)
  }
}

// Locale config helpers should round-trip safely.
assert.equal(isLocale("ja"), true)
assert.equal(isLocale("xx"), false)
assert.equal(pickFromAcceptLanguage("vi-VN,vi;q=0.9,en;q=0.8"), "vi")
assert.equal(pickFromAcceptLanguage("xx-XX"), DEFAULT_LOCALE)

// eslint-disable-next-line no-console
console.log(`OK — ${keys.length} keys × ${LOCALES.length - 1} non-default locales verified.`)
