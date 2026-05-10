import { defineConfig, devices } from "@playwright/test";

const slowMo = process.env.SLOW_MO ? parseInt(process.env.SLOW_MO) : 0;

export default defineConfig({
  testDir: "./e2e/specs",
  globalSetup: "./e2e/global-setup.ts",
  globalTeardown: "./e2e/global-teardown.ts",
  fullyParallel: false,
  retries: slowMo > 0 ? 0 : 1,
  timeout: slowMo > 0 ? 120_000 : 30_000,
  expect: {
    timeout: slowMo > 0 ? 30_000 : 10_000
  },
  use: {
    baseURL: "http://127.0.0.1:5173",
    trace: "on-first-retry",
    video: "on-first-retry",
    screenshot: "only-on-failure"
  },
  reporter: [["html", { outputFolder: "playwright-report" }], ["list"]],
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        launchOptions: {
          slowMo
        }
      }
    }
  ],
  webServer: {
    command: "npm run dev -- --host 127.0.0.1 --port 5173",
    url: "http://127.0.0.1:5173",
    reuseExistingServer: true,
    timeout: 120_000
  }
});
