import { defineConfig, devices } from "@playwright/test"

const PORT = process.env.E2E_PORT ? Number(process.env.E2E_PORT) : 3000
const BASE_URL = process.env.E2E_BASE_URL || `http://localhost:${PORT}`

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    video: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "staff-mobile",
      use: { ...devices["iPhone 14 Pro"] },
      testMatch: /staff-app\.spec\.ts/,
    },
    {
      name: "manager-mobile",
      use: { ...devices["Pixel 7"] },
      testMatch: /manager-app\.spec\.ts/,
    },
    {
      name: "sv-tablet",
      use: { ...devices["iPad Pro 11"] },
      testMatch: /sv-app\.spec\.ts/,
    },
    {
      name: "shared",
      use: { ...devices["Desktop Chrome"] },
      testMatch: /shared\.spec\.ts/,
    },
  ],
  webServer: process.env.E2E_NO_SERVER
    ? undefined
    : {
        command: "npm run dev",
        url: BASE_URL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
})
