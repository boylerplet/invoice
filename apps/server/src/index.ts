import { serve } from "@hono/node-server"
import { createApp } from "./app"
import { loadConfig } from "./config"
import { openDb } from "./db/client"

const config = loadConfig()
const db = openDb(config.dbFile)
const app = createApp({ config, db, now: () => new Date() })

serve({ fetch: app.fetch, port: config.port, hostname: config.host }, (info) => {
  console.log(`Invoice Studio listening on http://${config.host}:${info.port}`)
})
