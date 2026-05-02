import { test, expect } from "@playwright/test"

test.describe("Help & support shared flows", () => {
  test("help index renders FAQs and search filters", async ({ page }) => {
    await page.goto("/help")
    await expect(page.getByPlaceholder(/キーワードで検索/)).toBeVisible()
    await expect(page.getByText(/PIN を忘れて/)).toBeVisible()
    // search narrows results
    await page.getByPlaceholder(/キーワードで検索/).fill("PIN")
    await expect(page.getByText(/PIN を忘れて/)).toBeVisible()
  })

  test("help topic page renders markdown", async ({ page }) => {
    await page.goto("/help/clock-pin-forgot")
    await expect(page.getByRole("heading", { level: 2 })).toContainText(/PIN/)
    await expect(page.getByText(/サポートに問い合わせる/)).toBeVisible()
  })

  test("support form validates required fields", async ({ page }) => {
    await page.goto("/support")
    await page.getByTestId("support-submit").click()
    // HTML5 validation will block; ensure URL still on /support
    await expect(page).toHaveURL(/\/support/)
  })

  test("support form submits and shows confirmation", async ({ page }) => {
    await page.goto("/support")
    await page.getByTestId("support-category").selectOption("login")
    await page.getByTestId("support-subject").fill("E2E テスト")
    await page.getByTestId("support-body").fill("ログインできません。テスト送信。")
    await page.getByTestId("support-submit").click()
    await expect(page.getByText(/受付しました/)).toBeVisible({ timeout: 10_000 })
  })
})
