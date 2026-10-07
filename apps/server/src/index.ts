import { serve } from "@hono/node-server"
import { Hono } from "hono"

const app = new Hono()
app.get("/api/health", (c) => c.json({ ok: true }))

const port = Number(process.env.PORT ?? 3001)
const hostname = process.env.HOST ?? "127.0.0.1"
serve({ fetch: app.fetch, port, hostname }, (info) => {
  console.log(`server listening on http://${hostname}:${info.port}`)
})
