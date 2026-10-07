import { eq } from "drizzle-orm"
import type { WorkspaceSettings } from "@workspace/shared"
import { users, workspaces } from "../db/schema"
import { type DbLike, newId } from "./types"

export type WorkspaceRow = typeof workspaces.$inferSelect
export type UserRow = typeof users.$inferSelect

export const workspacesRepo = (db: DbLike) => ({
  get: (id: string): WorkspaceRow | undefined =>
    db.select().from(workspaces).where(eq(workspaces.id, id)).get(),

  create(
    input: { name: string; timezone: string; settings: WorkspaceSettings },
    now: Date
  ): WorkspaceRow {
    const row = { id: newId(), ...input, createdAt: now.toISOString() }
    db.insert(workspaces).values(row).run()
    return row
  },

  update(
    id: string,
    input: { name: string; timezone: string; settings: WorkspaceSettings }
  ): void {
    db.update(workspaces).set(input).where(eq(workspaces.id, id)).run()
  },
})

export const usersRepo = (db: DbLike) => ({
  getByUsername: (username: string): UserRow | undefined =>
    db
      .select()
      .from(users)
      .where(eq(users.username, username.toLowerCase()))
      .get(),

  getById: (id: string): UserRow | undefined =>
    db.select().from(users).where(eq(users.id, id)).get(),

  create(
    input: { workspaceId: string; username: string; passwordHash: string },
    now: Date
  ): UserRow {
    const row = {
      id: newId(),
      workspaceId: input.workspaceId,
      username: input.username.toLowerCase(),
      passwordHash: input.passwordHash,
      createdAt: now.toISOString(),
    }
    db.insert(users).values(row).run()
    return row
  },

  setPassword(id: string, passwordHash: string): void {
    db.update(users).set({ passwordHash }).where(eq(users.id, id)).run()
  },
})
