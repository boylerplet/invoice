import { loadConfig } from "../config"
import { openDb } from "../db/client"

const config = loadConfig()
openDb(config.dbFile).$client.close()
console.log(`Database is up to date: ${config.dbFile}`)
