/**
 * pnpm template:shots <id> [--version N] [--thumb]
 * Renders every fixture x {A4, Letter} through the dev print route into
 * .template-shots/<id>/v<N>/<scenario>-<paper>-p<k>.png for visual review.
 */
import { spawn, type ChildProcess } from "node:child_process"
import { existsSync, mkdirSync, readdirSync } from "node:fs"
import { join, resolve } from "node:path"
import { fixtures } from "../packages/templates/fixtures/index"
import { launchBrowser } from "./browser"

const BASE = "http://localhost:5173"
const args = process.argv.slice(2)
const id = args.find((a) => !a.startsWith("--")) ?? "studio"
const vIndex = args.indexOf("--version")
const templateDir = resolve("packages/templates/src/templates", id)
const versions = existsSync(templateDir)
  ? readdirSync(templateDir).flatMap((d) => (/^v[0-9]+$/.test(d) ? [Number(d.slice(1))] : []))
  : []
const version = vIndex >= 0 ? Number(args[vIndex + 1]) : Math.max(0, ...versions)
const thumb = args.includes("--thumb")
if (!versions.includes(version)) {
  console.error(`Unknown template ${id} v${version}`)
  process.exit(1)
}

async function isUp(): Promise<boolean> {
  try {
    return (await fetch(BASE)).ok
  } catch {
    return false
  }
}

async function ensureDevServer(): Promise<ChildProcess | null> {
  if (await isUp()) return null
  const child = spawn("pnpm", ["--filter", "web", "dev"], { shell: true, stdio: "ignore" })
  for (let i = 0; i < 60; i++) {
    if (await isUp()) return child
    await new Promise((r) => setTimeout(r, 1000))
  }
  child.kill()
  throw new Error("Dev server did not start")
}

const server = await ensureDevServer()
const browser = await launchBrowser()
const outDir = resolve(".template-shots", id, `v${version}`)
mkdirSync(outDir, { recursive: true })
try {
  const page = await browser.newPage({ deviceScaleFactor: 1.5 })
  for (const fixture of fixtures) {
    for (const paper of ["A4", "LETTER"] as const) {
      await page.goto(`${BASE}/print/fixture/${fixture.id}?template=${id}&version=${version}&paper=${paper}`)
      await page.waitForFunction("window.__INVOICE_READY__ === true", undefined, { timeout: 30_000 })
      const pages = page.locator(".tpl-page")
      const count = await pages.count()
      for (let k = 0; k < count; k++) {
        await pages.nth(k).screenshot({ path: join(outDir, `${fixture.id}-${paper.toLowerCase()}-p${k + 1}.png`) })
      }
      console.log(`${fixture.id} ${paper}: ${count} page(s)`)
      if (thumb && fixture.id === "typical-5-items" && paper === "A4") {
        const assets = resolve("packages/templates/src/templates", id, `v${version}`, "assets")
        mkdirSync(assets, { recursive: true })
        await pages.nth(0).screenshot({ path: join(assets, "thumbnail.png") })
      }
    }
  }
} finally {
  await browser.close()
  server?.kill()
}
console.log(`Screenshots: ${outDir}`)
