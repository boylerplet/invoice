import { expect, test } from "@playwright/test"
import { login } from "./helpers"

test.describe.configure({ mode: "serial" })

test("unauthenticated visitors are sent to the login page", async ({
  page,
}) => {
  await page.goto("/clients")
  await expect(page).toHaveURL(/\/login$/)
  await page.getByLabel("Username").fill("demo")
  await page.getByLabel("Password").fill("wrong-password")
  await page.getByRole("button", { name: "Sign in" }).click()
  await expect(page.getByRole("alert")).toContainText(
    "Wrong username or password"
  )
})

test("a user can set up numbering, profile, payment account and client", async ({
  page,
}) => {
  await login(page)

  await page.goto("/settings/numbering")
  await expect(page.getByTestId("number-preview")).toContainText(
    `INV-${new Date().getFullYear()}-`
  )
  await page.getByLabel("Prefix").fill("ACME")
  await expect(page.getByTestId("number-preview")).toContainText(
    `ACME-${new Date().getFullYear()}-`
  )
  await page.getByRole("button", { name: "Save numbering" }).click()
  await expect(page.getByText("Numbering saved")).toBeVisible()

  await page.goto("/settings/profiles")
  await page.getByRole("button", { name: "Add profile" }).click()
  await page.getByLabel("Display name").fill("Menon Design Co.")
  await page.getByLabel("Email").fill("hello@menon.example")
  await page.getByRole("button", { name: "Add tax ID" }).click()
  await page.getByLabel("GSTIN 1").fill("GSTIN")
  await page.getByLabel("29ABCDE1234F1Z5 1").fill("29ABCDE1234F1Z5")
  await page.getByRole("button", { name: "Save profile" }).click()
  await expect(page.getByText("Profile created")).toBeVisible()
  await page.keyboard.press("Escape")
  await expect(page.getByText("Menon Design Co.").first()).toBeVisible()

  await page.goto("/settings/payment-accounts")
  await page.getByRole("button", { name: "Add account" }).click()
  await page.getByRole("button", { name: "Indian bank (INR)" }).click()
  await page.getByLabel("Label", { exact: true }).fill("HDFC current")
  await page.getByLabel("Value 2").fill("50200012345678")
  await page.getByRole("button", { name: "Save account" }).click()
  await expect(page.getByText("Account created")).toBeVisible()

  await page.goto("/clients")
  await page.getByRole("button", { name: "New client" }).first().click()
  await page.getByLabel("Client name").fill("E2E Test Client")
  await page.getByRole("button", { name: "Save client" }).click()
  await expect(page.getByText("Client created")).toBeVisible()
  await expect(
    page.getByRole("link", { name: "E2E Test Client" })
  ).toBeVisible()

  await page.getByLabel("Search clients").fill("zzz")
  await expect(page.getByText("No clients match your search")).toBeVisible()
})

test("business settings save and persist", async ({ page }) => {
  await login(page)
  await page.goto("/settings/business")
  await page.getByLabel("Default due days").fill("30")
  await page.getByRole("button", { name: "Save changes" }).click()
  await expect(page.getByText("Business settings saved")).toBeVisible()
  await page.reload()
  await expect(page.getByLabel("Default due days")).toHaveValue("30")
  await page.getByLabel("Default due days").fill("abc")
  await page.getByRole("button", { name: "Save changes" }).click()
  await expect(page.getByRole("alert").first()).toBeVisible()
})

test("password can be changed and the user can sign out", async ({ page }) => {
  await login(page)
  await page.goto("/settings/account")
  await page.getByLabel("Current password").fill("demo1234")
  await page.getByLabel("New password", { exact: true }).fill("demo12345")
  await page.getByLabel("Repeat new password").fill("demo12345")
  await page.getByRole("button", { name: "Change password" }).click()
  await expect(page.getByText("Password changed")).toBeVisible()
  // restore so later specs can still sign in with the standard password
  await page.getByLabel("Current password").fill("demo12345")
  await page.getByLabel("New password", { exact: true }).fill("demo1234")
  await page.getByLabel("Repeat new password").fill("demo1234")
  await page.getByRole("button", { name: "Change password" }).click()
  await expect(page.getByText("Password changed").last()).toBeVisible()
  await page.getByRole("button", { name: "Account menu" }).click()
  await page.getByRole("menuitem", { name: "Sign out" }).click()
  await expect(page).toHaveURL(/\/login$/)
})
