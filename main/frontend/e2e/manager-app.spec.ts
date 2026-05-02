import { test, expect } from "@playwright/test"

test.describe("Manager app", () => {
  test.beforeEach(async ({ context }) => {
    await context.addInitScript(() => {
      window.localStorage.setItem("onboarding_manager_done", "1")
      window.localStorage.setItem("aentro.demo_role", "manager")
      window.localStorage.setItem("manager.store_id", "S-1001")
    })
  })

  test("scenario 1: home renders", async ({ page }) => {
    await page.goto("/manager")
    await expect(page.getByText(/AENTRO 店長|店長/).first()).toBeVisible({ timeout: 10_000 })
  })

  test("scenario 2: navigates to daily report", async ({ page }) => {
    await page.goto("/manager")
    await page.locator('a[data-onboarding="manager-daily-report"]').first().click()
    await expect(page).toHaveURL(/\/manager\/daily-report/)
  })

  test("scenario 3: navigates to waste log", async ({ page }) => {
    await page.goto("/manager")
    await page.locator('a[data-onboarding="manager-waste"]').first().click()
    await expect(page).toHaveURL(/\/manager\/waste/)
  })

  test("scenario 4: navigates to complaints page", async ({ page }) => {
    await page.goto("/manager/complaint")
    await expect(page).toHaveURL(/\/manager\/complaint/)
    // Title should appear
    await expect(page.getByText(/クレーム/).first()).toBeVisible()
  })

  test("scenario 5: settings → help button works", async ({ page }) => {
    await page.goto("/manager/settings")
    await page.getByRole("button", { name: /ヘルプ/i }).click()
    await page.getByText(/お問い合わせ/).first().click()
    await expect(page).toHaveURL(/\/support/)
  })
})
