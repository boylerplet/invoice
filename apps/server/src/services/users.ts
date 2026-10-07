import { DEFAULT_WORKSPACE_SETTINGS } from "@workspace/shared"
import type { Db } from "../db/client"
import { hashPassword } from "../auth/password"
import { usersRepo, workspacesRepo, type UserRow, type WorkspaceRow } from "../repos/workspaces"

export interface CreateUserInput {
  username: string
  password: string
  /** Name for a new workspace; ignored when `workspaceId` is given. */
  workspaceName?: string
  workspaceId?: string
  timezone: string
}

/** One login belongs to exactly one workspace; several logins may share it. */
export async function createUser(
  db: Db,
  input: CreateUserInput,
  now: Date
): Promise<{ user: UserRow; workspace: WorkspaceRow }> {
  const username = input.username.trim()
  if (username === "") throw new Error("Username is required")
  if (input.password.length < 8) throw new Error("Password must be at least 8 characters")
  if (usersRepo(db).getByUsername(username)) throw new Error(`User "${username}" already exists`)

  let workspace = input.workspaceId ? workspacesRepo(db).get(input.workspaceId) : undefined
  if (input.workspaceId && !workspace) throw new Error(`Workspace ${input.workspaceId} does not exist`)
  if (!workspace) {
    if (!input.workspaceName) throw new Error("Provide --workspace <name> or --workspace-id <id>")
    workspace = workspacesRepo(db).create(
      { name: input.workspaceName, timezone: input.timezone, settings: DEFAULT_WORKSPACE_SETTINGS },
      now
    )
  }
  const user = usersRepo(db).create(
    { workspaceId: workspace.id, username, passwordHash: await hashPassword(input.password) },
    now
  )
  return { user, workspace }
}
