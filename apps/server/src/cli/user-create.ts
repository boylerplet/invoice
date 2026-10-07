import { loadConfig } from "../config"
import { openDb } from "../db/client"
import { createUser } from "../services/users"
import { parseArgs, stringArg } from "./args"

const args = parseArgs(process.argv.slice(2))
const username = stringArg(args, "username")
const password = stringArg(args, "password")

if (!username || !password) {
  console.error(
    'Usage: pnpm user:create --username <u> --password <p> --workspace "<Business name>" [--workspace-id <id>]'
  )
  process.exit(1)
}

const config = loadConfig()
const db = openDb(config.dbFile)
try {
  const { user, workspace } = await createUser(
    db,
    {
      username,
      password,
      workspaceName: stringArg(args, "workspace"),
      workspaceId: stringArg(args, "workspace-id"),
      timezone: config.defaultTimezone,
    },
    new Date()
  )
  console.log(
    `Created user "${user.username}" in workspace "${workspace.name}" (${workspace.id})`
  )
} catch (error) {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
}
