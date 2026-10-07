import { chromium, type Browser } from "@playwright/test"

/** Launches the installed Edge/Chrome (no browser download needed). */
export function launchBrowser(): Promise<Browser> {
  const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH || undefined
  return chromium.launch(executablePath ? { executablePath } : { channel: "msedge" })
}
