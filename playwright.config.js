import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "tests/browser",
  timeout: 60000,
  workers: 1,
  use: {
    baseURL: "http://127.0.0.1:5173/tiny-siege/",
    viewport: { width: 1440, height: 1000 },
    hasTouch: true,
    screenshot: "only-on-failure",
    launchOptions: process.env.PLAYWRIGHT_USE_BUNDLED
      ? {}
      : { executablePath: "/usr/bin/chromium", args: ["--no-sandbox"] },
  },
  webServer: {
    command: "npm run dev -- --port 5173 --strictPort",
    url: "http://127.0.0.1:5173/tiny-siege/",
    reuseExistingServer: !process.env.CI,
  },
});
