import { randomBytes } from "node:crypto"
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { dirname, isAbsolute, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"

export interface Config {
  port: number
  host: string
  dataDir: string
  dbFile: string
  uploadsDir: string
  sessionSecret: string
  printSecret: string
  cookieSecure: boolean
  puppeteerExecutablePath: string | null
  defaultTimezone: string
  /** Built web app, served in production when it exists. */
  webDist: string
  /** Extra Origins accepted on mutating requests (the Vite dev server proxies with its own Host). */
  allowedOrigins: string[]
}

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..")

interface Secrets {
  sessionSecret: string
  printSecret: string
}

function loadSecrets(dataDir: string): Secrets {
  const file = join(dataDir, "secrets.json")
  const stored: Partial<Secrets> = existsSync(file)
    ? (JSON.parse(readFileSync(file, "utf8")) as Partial<Secrets>)
    : {}
  const secrets: Secrets = {
    sessionSecret:
      process.env.SESSION_SECRET || stored.sessionSecret || randomBytes(32).toString("hex"),
    printSecret:
      process.env.PRINT_SECRET || stored.printSecret || randomBytes(32).toString("hex"),
  }
  if (!existsSync(file)) writeFileSync(file, JSON.stringify(secrets, null, 2))
  return secrets
}

export function loadConfig(): Config {
  const webPort = process.env.WEB_PORT ?? "5173"
  const configured = process.env.DATA_DIR
  const dataDir = configured
    ? isAbsolute(configured)
      ? configured
      : resolve(REPO_ROOT, configured)
    : join(REPO_ROOT, "data")
  const uploadsDir = join(dataDir, "uploads")
  mkdirSync(uploadsDir, { recursive: true })
  const secrets = loadSecrets(dataDir)
  return {
    port: Number(process.env.PORT ?? 3001),
    host: process.env.HOST ?? "127.0.0.1",
    dataDir,
    dbFile: join(dataDir, "invoice.db"),
    uploadsDir,
    ...secrets,
    cookieSecure: process.env.COOKIE_SECURE === "true",
    puppeteerExecutablePath: process.env.PUPPETEER_EXECUTABLE_PATH || null,
    defaultTimezone: process.env.DEFAULT_TIMEZONE || "Asia/Kolkata",
    webDist: join(REPO_ROOT, "apps/web/dist"),
    allowedOrigins:
      process.env.NODE_ENV === "production"
        ? []
        : [`http://localhost:${webPort}`, `http://127.0.0.1:${webPort}`],
  }
}
