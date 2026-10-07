import AxeBuilder from "@axe-core/playwright"
import { expect, test, type Page } from "@playwright/test"
import { login } from "./helpers"

/** Pages that must have no serious or critical WCAG A/AA violations. */
const ROUTES = [
  "/",
  "/invoices",
  "/clients",
  "/activity",
  "/settings/business",
  "/settings/profiles",
  "/settings/numbering",
  "/settings/templates",
]

async function violations(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa"])
    .analyze()
  return results.violations
    .filter((v) => v.impact === "serious" || v.impact === "critical")
    .map(
      (v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(" | ")}`
    )
}

test("the login page is accessible", async ({ page }) => {
  await page.goto("/login")
  await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible()
  expect(await violations(page)).toEqual([])
})

test("the main screens are accessible", async ({ page }) => {
  await login(page)
  for (const route of ROUTES) {
    await page.goto(route)
    await page.waitForLoadState("networkidle")
    expect(await violations(page), route).toEqual([])
  }
})

test("the editor is accessible and keyboard friendly", async ({ page }) => {
  await login(page)
  await page.goto("/invoices")
  await page.getByTestId("invoice-row").first().click()
  await expect(page.getByTestId("invoice-number")).toBeVisible()
  await page.waitForLoadState("networkidle")
  expect(await violations(page)).toEqual([])
  await page.keyboard.press("Tab")
  expect(await page.evaluate(() => document.activeElement?.tagName)).not.toBe(
    "BODY"
  )
})
