import { readFileSync } from "node:fs"
import { join } from "node:path"
import { strToU8, zipSync } from "fflate"
import type { Deps } from "../http/types"
import { backupRepo } from "../repos/backup"
import { listUploads } from "./uploads"

export function createBackupService(deps: Deps) {
  function snapshot(ws: string) {
    return {
      exportedAt: deps.now().toISOString(),
      formatVersion: 1,
      ...backupRepo(deps.db).exportAll(ws),
      uploads: listUploads(deps.config.uploadsDir),
    }
  }

  return {
    json: (ws: string) => snapshot(ws),

    /** data.json plus every uploaded file under uploads/. */
    zip(ws: string): Uint8Array {
      const files: Record<string, Uint8Array> = {
        "data.json": strToU8(JSON.stringify(snapshot(ws), null, 2)),
      }
      for (const name of listUploads(deps.config.uploadsDir)) {
        files[`uploads/${name}`] = readFileSync(join(deps.config.uploadsDir, name))
      }
      return zipSync(files)
    },
  }
}

export type BackupService = ReturnType<typeof createBackupService>
