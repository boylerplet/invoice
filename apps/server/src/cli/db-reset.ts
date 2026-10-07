import { rmSync } from "node:fs"
import { loadConfig } from "../config"
import { openDb } from "../db/client"

const config = loadConfig()
for (const suffix of ["", "-wal", "-shm"]) rmSync(`${config.dbFile}${suffix}`, { force: true })
rmSync(config.uploadsDir, { recursive: true, force: true })
loadConfig()
openDb(config.dbFile).$client.close()
console.log(`Database reset: ${config.dbFile}`)
