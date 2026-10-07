import { createHash, randomBytes } from "node:crypto"
import { eq } from "drizzle-orm"
import type { Db } from "../db/client"
import { sessions, users } from "../db/schema"
import type { AuthContext } from "../http/types"

export const SESSION_DAYS = 30
const DAY_MS = 86_400_000

const digest = (token: string) => createHash("sha256").update(token).digest("hex")

export function createSession(db: Db, userId: string, now: Date): string {
  const token = randomBytes(32).toString("base64url")
  db.insert(sessions)
    .values({
      id: digest(token),
      userId,
      createdAt: now.toISOString(),
      lastSeenAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + SESSION_DAYS * DAY_MS).toISOString(),
    })
    .run()
  return token
}

/** Returns the signed-in user and slides the expiry, or null if missing/expired. */
export function resolveSession(db: Db, token: string, now: Date): AuthContext | null {
  const id = digest(token)
  const row = db
    .select({
      expiresAt: sessions.expiresAt,
      userId: users.id,
      workspaceId: users.workspaceId,
      username: users.username,
    })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(eq(sessions.id, id))
    .get()
  if (!row) return null
  if (row.expiresAt <= now.toISOString()) {
    db.delete(sessions).where(eq(sessions.id, id)).run()
    return null
  }
  db.update(sessions)
    .set({
      lastSeenAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + SESSION_DAYS * DAY_MS).toISOString(),
    })
    .where(eq(sessions.id, id))
    .run()
  return { userId: row.userId, workspaceId: row.workspaceId, username: row.username }
}

export function destroySession(db: Db, token: string): void {
  db.delete(sessions).where(eq(sessions.id, digest(token))).run()
}

export function destroyUserSessions(db: Db, userId: string): void {
  db.delete(sessions).where(eq(sessions.userId, userId)).run()
}
