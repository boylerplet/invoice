/**
 * pnpm tsx scripts/qa-shots.ts [route ...]
 * Signs in as the demo user and saves a full-page screenshot of each route to .qa-shots/.
 * Needs `pnpm dev` running and a `demo` user (pnpm db:seed or pnpm user:create).
 */
import { mkdirSync } from "node:fs"
import { resolve } from "node:path"
import { launchBrowser } from "./browser"

const BASE = process.env.QA_BASE ?? "http://localhost:5173"
const routes = process.argv.slice(2)
const targets =
  routes.length > 0
    ? routes
    : [
        "/",
        "/invoices",
        "/clients",
        "/settings/business",
        "/settings/numbering",
      ]

const outDir = resolve(".qa-shots")
mkdirSync(outDir, { recursive: true })
const browser = await launchBrowser()
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  await page.goto(`${BASE}/login`)
  await page.getByLabel("Username").fill("demo")
  await page.getByLabel("Password").fill("demo1234")
  await page.getByRole("button", { name: "Sign in" }).click()
  await page.waitForURL(`${BASE}/`)
  for (const route of targets) {
    await page.goto(`${BASE}${route}`)
    await page.waitForLoadState("networkidle")
    await page.waitForTimeout(400)
    const name =
      route === "/"
        ? "dashboard"
        : route.replace(/^\//, "").replace(/[/?=&]/g, "-")
    await page.screenshot({
      path: resolve(outDir, `${name}.png`),
      fullPage: true,
    })
    console.log(`saved ${name}.png`)
  }
} finally {
  await browser.close()
}
