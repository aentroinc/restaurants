import { test, expect } from "@playwright/test"

// Staff app — 5 critical scenarios.
// Tests run against the live Next dev server (configured in playwright.config.ts).
// They use mocked auth: the staff layout should fall through to demo auth when no session exists.

test.describe("Staff app", () => {
  test.beforeEach(async ({ page, context }) => {
    // Skip onboarding so target elements aren't blocked by overlay.
    await context.addInitScript(() => {
      window.localStorage.setItem("onboarding_staff_done", "1")
      window.localStorage.setItem("aentro.demo_role", "staff")
    })
  })

  test("scenario 1: lands on home and shows tab bar", async ({ page }) => {
    await page.goto("/staff")
    await expect(page.getByText(/AENTRO 現場/i)).toBeVisible({ timeout: 10_000 })
    // Tab bar should expose 7 tabs
    const tabs = page.locator("nav a, nav button").filter({ hasText: /ホーム|打刻|チェック|ロス|客声|学習|設定/ })
    await expect(tabs.first()).toBeVisible()
  })

  test("scenario 2: navigates to clock page from tab", async ({ page }) => {
    await page.goto("/staff")
    await page.locator('a[data-onboarding="staff-clock"]').click()
    await expect(page).toHaveURL(/\/staff\/clock/)
  })

  test("scenario 3: navigates to loss reporting", async ({ page }) => {
    await page.goto("/staff")
    await page.locator('a[data-onboarding="staff-loss"]').click()
    await expect(page).toHaveURL(/\/staff\/loss/)
  })

  test("scenario 4: navigates to settings and finds help button", async ({ page }) => {
    await page.goto("/staff/settings")
    // Help floating button should be present
    const helpBtn = page.getByRole("button", { name: /ヘルプ/i })
    await expect(helpBtn).toBeVisible()
  })

  test("scenario 5: opens help button menu and visits help page", async ({ page }) => {
    await page.goto("/staff")
    await page.getByRole("button", { name: /ヘルプ/i }).click()
    await page.getByText(/ヘルプ・FAQ/).click()
    await expect(page).toHaveURL(/\/help/)
    await expect(page.getByPlaceholder(/キーワードで検索/)).toBeVisible()
  })
})
