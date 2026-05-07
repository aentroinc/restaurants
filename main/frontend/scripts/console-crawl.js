#!/usr/bin/env node
/* eslint-disable */
const { chromium } = require("playwright")

const ROUTES = [
  "/", "/about", "/action-loop", "/admin", "/ai-analyst", "/aip-logic", "/auth",
  "/campaigns", "/case-studies", "/daily-brief", "/data-quality", "/demand",
  "/demo-tour", "/expansion", "/food-cost", "/franchise", "/haccp", "/help",
  "/incidents", "/labor", "/legal", "/line-check", "/login", "/manager",
  "/meeting-packs", "/onboarding", "/pipeline", "/products", "/qsc", "/recipes",
  "/staff", "/store-brief", "/stores", "/supply-chain", "/support", "/sv",
  "/sv-missions", "/sv-planner", "/tasks", "/value-realization",
  "/workflow-builder", "/workspace", "/zensho-executive", "/zensho-mtp",
  "/zensho-pilot", "/zensho-pilot/p1", "/meeting-packs/m1", "/help/getting-started",
  "/pipeline/p1", "/products/prod1", "/stores/s1", "/aip-logic/a1",
  "/food-cost/store1", "/sv/visit/store1", "/workspace/canvas/c1",
  "/admin/ontology", "/admin/users", "/admin/roles", "/admin/connector-health",
  "/admin/security", "/admin/lineage", "/admin/system-status",
  "/auth/login", "/auth/mfa", "/legal/terms", "/legal/privacy-policy",
]

async function main() {
  const base = process.env.BASE_URL || "http://localhost:3000"
  const browser = await chromium.launch()
  const context = await browser.newContext({ ignoreHTTPSErrors: true })
  const page = await context.newPage()

  const results = []

  for (const route of ROUTES) {
    const pageErrors = []

    page.removeAllListeners("pageerror")
    page.on("pageerror", (err) => {
      pageErrors.push(err.message)
    })

    let status = 0
    try {
      const resp = await page.goto(base + route, {
        waitUntil: "domcontentloaded",
        timeout: 15000,
      })
      status = resp ? resp.status() : 0
    } catch (e) {
      pageErrors.push("NAV: " + e.message)
    }

    // small wait for client-side errors after hydration
    await page.waitForTimeout(800)

    results.push({ route, status, pageErrors })
    const ok = status >= 200 && status < 400 && pageErrors.length === 0
    console.log(`${ok ? "OK " : "BAD"} ${status} ${route}  pageErrors=${pageErrors.length}`)
    if (!ok) {
      pageErrors.slice(0, 3).forEach((e) => console.log("    PAGE ERR:", e.substring(0, 240)))
    }
  }

  await browser.close()

  const bad = results.filter((r) => r.status < 200 || r.status >= 400 || r.pageErrors.length > 0)
  console.log(`\nTotal: ${results.length}, Crashing: ${bad.length}`)
  process.exit(bad.length > 0 ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(2)
})
