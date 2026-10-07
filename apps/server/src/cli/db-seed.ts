import { existsSync, rmSync } from "node:fs"
import { loadConfig } from "../config"
import { openDb, schema } from "../db/client"
import { seedDemo, DEMO_PASSWORD, DEMO_USERNAME } from "../seed/run"
import { parseArgs } from "./args"

const args = parseArgs(process.argv.slice(2))
const force = args.force === true

const config = loadConfig()
if (force) {
  for (const suffix of ["", "-wal", "-shm"])
    rmSync(`${config.dbFile}${suffix}`, { force: true })
  rmSync(config.uploadsDir, { recursive: true, force: true })
  loadConfig()
}
const db = openDb(config.dbFile)

if (
  existsSync(config.dbFile) &&
  db.select().from(schema.workspaces).limit(1).all().length > 0
) {
  console.error(
    "The database already has data. Run `pnpm db:seed --force` to wipe it and seed again, or `pnpm db:reset` first."
  )
  db.$client.close()
  process.exit(1)
}

const result = await seedDemo(db, config, new Date())
db.$client.close()
console.log(
  `Seeded ${result.invoices} invoices. Sign in as "${DEMO_USERNAME}" with password "${DEMO_PASSWORD}".`
)
