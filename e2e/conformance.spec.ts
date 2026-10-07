import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { expect, test, type Page } from "@playwright/test"
import { fixtures } from "../packages/templates/fixtures/index"

interface Manifest {
  id: string
  version: number
  fonts: { family: string }[]
  supports: Record<string, boolean>
}

/** supports flag -> [fixture that has the data, text that must appear]. */
const FLAG_PROBES: Record<string, [string, string]> = {
  dueDate: ["typical-5-items", "30 Apr 2026"],
  reference: ["typical-5-items", "PO-7731"],
  paymentTerms: ["typical-5-items", "Due within 15 days"],
  notes: ["with-notes-and-payment", "Thank you for your business."],
  paymentDetails: ["with-notes-and-payment", "50200012345678"],
  tax: ["tax-and-adjustments", "GST"],
  adjustments: ["tax-and-adjustments", "Early payment discount"],
  logo: ["typical-5-items", "IMG"],
}

const GLYPHS = ["₹", "$", "–", "·", "•"]

async function manifests(page: Page): Promise<Manifest[]> {
  await page.goto("/dev/registry")
  return JSON.parse(
    (await page.locator("#registry").textContent()) ?? "[]"
  ) as Manifest[]
}

async function open(page: Page, m: Manifest, scenario: string, paper: string) {
  await page.goto(
    `/print/fixture/${scenario}?template=${m.id}&version=${m.version}&paper=${paper}`
  )
  await page.waitForFunction("window.__INVOICE_READY__ === true", undefined, {
    timeout: 30_000,
  })
}

test("template CSS selectors are scoped", async ({ page }) => {
  for (const m of await manifests(page)) {
    const prefix = `.tpl-${m.id}-v${m.version}`
    const css = readFileSync(
      resolve(
        `packages/templates/src/templates/${m.id}/v${m.version}/template.css`
      ),
      "utf8"
    ).replace(/\/\*[\s\S]*?\*\//g, "")
    const rules = [...css.matchAll(/(^|\})\s*([^{}@]+)\{/g)].map(
      (r) => r[2] ?? ""
    )
    expect(rules.length).toBeGreaterThan(0)
    for (const rule of rules) {
      for (const selector of rule
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)) {
        expect(
          selector.startsWith(prefix),
          `"${selector}" must start with ${prefix}`
        ).toBe(true)
      }
    }
  }
})

test("every fixture renders cleanly on A4 and Letter", async ({ page }) => {
  for (const m of await manifests(page)) {
    for (const fixture of fixtures) {
      for (const paper of ["A4", "LETTER"]) {
        await open(page, m, fixture.id, paper)
        const label = `${m.id} v${m.version} ${fixture.id} ${paper}`
        expect(
          await page.locator(".tpl-doc").getAttribute("data-layout-status"),
          label
        ).toBe("ready")
        expect(
          await page.locator(".tpl-doc").getAttribute("data-overflow"),
          `${label}: overflow`
        ).toBe("0")
        expect(
          await page.locator(".tpl-page table").count(),
          `${label}: <table>`
        ).toBe(0)
        const pages = await page.locator(".tpl-page").count()
        expect(
          await page.locator(".tpl-doc").getAttribute("data-page-count")
        ).toBe(String(pages))
      }
    }
  }
})

test("glyphs come from the template font, not a fallback", async ({ page }) => {
  for (const m of await manifests(page)) {
    await open(page, m, "typical-5-items", "A4")
    const families = [...new Set(m.fonts.map((f) => f.family))]
    for (const family of families) {
      const result = await page.evaluate(
        ([fam, glyphs]) => {
          const faces = [...document.fonts].filter(
            (f) => f.family.replace(/"/g, "") === fam
          )
          const covers = (face: FontFace, ch: string) => {
            const cp = ch.codePointAt(0) ?? 0
            return face.unicodeRange.split(",").some((r) => {
              const [lo, hi] = r.trim().replace("U+", "").split("-")
              const start = parseInt(lo ?? "0", 16)
              return cp >= start && cp <= parseInt(hi ?? lo ?? "0", 16)
            })
          }
          return (glyphs as string[]).map((ch) => ({
            ch,
            loaded: faces.some((f) => covers(f, ch) && f.status === "loaded"),
          }))
        },
        [family, GLYPHS] as const
      )
      for (const r of result)
        expect(
          r.loaded,
          `${m.id}: ${r.ch} must be covered by a loaded ${family} face`
        ).toBe(true)
    }
  }
})

test("every supports flag that is true renders its field", async ({ page }) => {
  for (const m of await manifests(page)) {
    for (const [flag, [scenario, needle]] of Object.entries(FLAG_PROBES)) {
      if (!m.supports[flag]) continue
      await open(page, m, scenario, "A4")
      const found =
        needle === "IMG"
          ? (await page.locator(".tpl-page img").count()) > 0
          : (await page.locator(".tpl-doc").innerText()).includes(needle)
      expect(
        found,
        `${m.id}: supports.${flag} is true but "${needle}" is not rendered`
      ).toBe(true)
    }
  }
})

test("a flat charge leaves the quantity cell empty", async ({ page }) => {
  const [m] = await manifests(page)
  await open(page, m as Manifest, "flat-no-qty", "A4")
  const text = await page.locator(".tpl-doc").innerText()
  expect(text).not.toMatch(/\bQty\b/i)
})
