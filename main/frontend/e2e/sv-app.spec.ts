import { test, expect } from "@playwright/test"

test.describe("SV app", () => {
  test.beforeEach(async ({ context }) => {
    await context.addInitScript(() => {
      window.localStorage.setItem("onboarding_sv_done", "1")
      window.localStorage.setItem("aentro.demo_role", "sv")
    })
  })

  test("scenario 1: dashboard / area heatmap loads", async ({ page }) => {
    await page.goto("/sv")
    await expect(page.getByText(/AENTRO SV/i).first()).toBeVisible({ timeout: 10_000 })
  })

  test("scenario 2: navigates to visit plan", async ({ page }) => {
    await page.goto("/sv")
    await page.locator('a[data-onboarding="sv-plan"]').first().click()
    await expect(page).toHaveURL(/\/sv\/plan/)
  })

  test("scenario 3: navigates to AI prep", async ({ page }) => {
    await page.goto("/sv")
    await page.locator('a[data-onboarding="sv-ai-prep"]').first().click()
    await expect(page).toHaveURL(/\/sv\/ai-prep/)
  })

  test("scenario 4: improvement page is reachable", async ({ page }) => {
    await page.goto("/sv/improvement")
    await expect(page).toHaveURL(/\/sv\/improvement/)
  })

  test("scenario 5: help button opens then visits help", async ({ page }) => {
    await page.goto("/sv")
    await page.getByRole("button", { name: /ヘルプ/i }).click()
    await page.getByText(/ヘルプ・FAQ/).click()
    await expect(page).toHaveURL(/\/help/)
  })
})
