import Database from "better-sqlite3"
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3"
import { migrate } from "drizzle-orm/better-sqlite3/migrator"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import * as schema from "./schema"

export type Db = BetterSQLite3Database<typeof schema> & { $client: Database.Database }

const MIGRATIONS = resolve(dirname(fileURLToPath(import.meta.url)), "../../drizzle")

/** Opens (and migrates) a SQLite database. Use ":memory:" in tests. */
export function openDb(file: string): Db {
  const sqlite = new Database(file)
  sqlite.pragma("journal_mode = WAL")
  sqlite.pragma("foreign_keys = ON")
  sqlite.pragma("busy_timeout = 5000")
  const db = drizzle(sqlite, { schema })
  migrate(db, { migrationsFolder: MIGRATIONS })
  return db
}

export { schema }
