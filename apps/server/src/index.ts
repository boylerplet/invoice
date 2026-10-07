import { serve } from "@hono/node-server"
import { createApp } from "./app"
import { loadConfig } from "./config"
import { openDb } from "./db/client"
import { findBrowser } from "./services/pdf"

const config = loadConfig()
const db = openDb(config.dbFile)
const app = createApp({ config, db, now: () => new Date() })

const server = serve({ fetch: app.fetch, port: config.port, hostname: config.host }, (info) => {
  console.log(`Invoice Studio listening on http://${config.host}:${info.port}`)
  if (!findBrowser(config)) {
    console.warn("No Chrome, Edge or Chromium found: PDF export is unavailable. Set PUPPETEER_EXECUTABLE_PATH to enable it.")
  }
})

async function shutdown() {
  server.close()
  await app.closePdf()
  process.exit(0)
}
process.on("SIGINT", () => void shutdown())
process.on("SIGTERM", () => void shutdown())
