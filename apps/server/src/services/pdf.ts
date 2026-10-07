import { existsSync } from "node:fs"
import puppeteer, { type Browser } from "puppeteer-core"
import type { Config } from "../config"
import { ApiError } from "../http/errors"

const CANDIDATES = [
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  "/usr/bin/google-chrome",
  "/usr/bin/google-chrome-stable",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
  "/snap/bin/chromium",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
]

/** The browser used for PDFs: PUPPETEER_EXECUTABLE_PATH, else the first installed Chrome/Edge/Chromium. */
export function findBrowser(
  config: Pick<Config, "puppeteerExecutablePath">,
  exists: (path: string) => boolean = existsSync
): string | null {
  if (config.puppeteerExecutablePath)
    return exists(config.puppeteerExecutablePath)
      ? config.puppeteerExecutablePath
      : null
  return CANDIDATES.find(exists) ?? null
}

/** Characters Windows and most file systems reject, plus control characters. */
export function pdfFilename(number: string, clientName: string): string {
  const printable = [...`${number} - ${clientName}`]
    .filter((ch) => ch.charCodeAt(0) >= 32)
    .join("")
  const clean = printable
    .replace(/[\\/:*?"<>|]/g, "")
    .replace(/\s+/g, " ")
    .trim()
  return `${clean || "invoice"}.pdf`
}

export interface PdfRenderer {
  /** Prints the print route of `printUrl` and returns the PDF bytes. */
  render(printUrl: string): Promise<Uint8Array>
  close(): Promise<void>
}

/** Keeps one warm browser; every request gets its own page. */
export function createPdfRenderer(config: Config): PdfRenderer {
  let browser: Promise<Browser> | null = null

  function launch(): Promise<Browser> {
    const executablePath = findBrowser(config)
    if (!executablePath) {
      throw new ApiError(
        503,
        "NO_BROWSER",
        "PDF export needs Chrome, Edge or Chromium. Install one, or set PUPPETEER_EXECUTABLE_PATH to its executable."
      )
    }
    return puppeteer.launch({
      executablePath,
      headless: true,
      args: ["--no-first-run", "--disable-gpu", "--font-render-hinting=none"],
    })
  }

  async function get(): Promise<Browser> {
    browser ??= Promise.resolve().then(launch)
    try {
      const current = await browser
      if (current.connected) return current
    } catch (error) {
      browser = null
      throw error
    }
    browser = null
    return get()
  }

  return {
    async render(printUrl) {
      const page = await (await get()).newPage()
      try {
        await page.goto(printUrl, {
          waitUntil: "networkidle0",
          timeout: 30_000,
        })
        await page.waitForFunction("window.__INVOICE_READY__ === true", {
          timeout: 30_000,
        })
        return await page.pdf({
          preferCSSPageSize: true,
          printBackground: true,
          margin: { top: 0, right: 0, bottom: 0, left: 0 },
        })
      } finally {
        await page.close().catch(() => undefined)
      }
    },
    async close() {
      const current = browser
      browser = null
      if (current) await (await current).close().catch(() => undefined)
    },
  }
}
