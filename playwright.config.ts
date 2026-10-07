import { defineConfig } from "@playwright/test"

const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH || undefined

export default defineConfig({
  testDir: "e2e",
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:5174",
    ...(executablePath
      ? { launchOptions: { executablePath } }
      : { channel: "msedge" as const }),
  },
  webServer: {
    command: "pnpm e2e:server",
    url: "http://localhost:5174",
    reuseExistingServer: false,
    timeout: 120_000,
    stdout: "pipe",
    stderr: "pipe",
  },
})
