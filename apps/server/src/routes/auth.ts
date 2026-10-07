import { changePasswordInputSchema, loginInputSchema } from "@workspace/shared"
import { getConnInfo } from "@hono/node-server/conninfo"
import { Hono } from "hono"
import { deleteCookie, getCookie, setCookie } from "hono/cookie"
import { hashPassword, verifyPassword } from "../auth/password"
import { requireAuth, SESSION_COOKIE } from "../auth/middleware"
import { LoginLimiter } from "../auth/rate-limit"
import { createSession, destroySession, destroyUserSessions, SESSION_DAYS } from "../auth/sessions"
import { jsonBody } from "../http/body"
import { ApiError } from "../http/errors"
import type { AppEnv, Deps } from "../http/types"
import { usersRepo, workspacesRepo } from "../repos/workspaces"

function clientIp(c: Parameters<typeof getConnInfo>[0]): string {
  try {
    return getConnInfo(c).remote.address ?? "local"
  } catch {
    return "local"
  }
}

export function authRoutes(deps: Deps) {
  const app = new Hono<AppEnv>()
  const limiter = new LoginLimiter()
  const guard = requireAuth(deps)

  app.post("/login", async (c) => {
    const input = await jsonBody(c, loginInputSchema)
    const key = `${input.username.toLowerCase()}|${clientIp(c)}`
    if (limiter.isBlocked(key)) {
      throw new ApiError(429, "RATE_LIMITED", "Too many failed attempts. Try again in 15 minutes.")
    }
    const user = usersRepo(deps.db).getByUsername(input.username)
    const ok = user ? await verifyPassword(user.passwordHash, input.password) : false
    if (!user || !ok) {
      limiter.recordFailure(key)
      throw new ApiError(401, "BAD_CREDENTIALS", "Wrong username or password")
    }
    limiter.reset(key)
    const token = createSession(deps.db, user.id, deps.now())
    setCookie(c, SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: "Lax",
      secure: deps.config.cookieSecure,
      path: "/",
      maxAge: SESSION_DAYS * 86_400,
    })
    return c.json({ ok: true })
  })

  app.post("/logout", (c) => {
    const token = getCookie(c, SESSION_COOKIE)
    if (token) destroySession(deps.db, token)
    deleteCookie(c, SESSION_COOKIE, { path: "/" })
    return c.json({ ok: true })
  })

  app.get("/me", guard, (c) => {
    const auth = c.get("auth")
    const workspace = workspacesRepo(deps.db).get(auth.workspaceId)
    if (!workspace) throw new ApiError(401, "UNAUTHENTICATED", "Please sign in")
    return c.json({ user: { username: auth.username }, workspace })
  })

  app.post("/change-password", guard, async (c) => {
    const auth = c.get("auth")
    const input = await jsonBody(c, changePasswordInputSchema)
    const repo = usersRepo(deps.db)
    const user = repo.getById(auth.userId)
    if (!user || !(await verifyPassword(user.passwordHash, input.currentPassword))) {
      throw new ApiError(422, "VALIDATION", "Current password is wrong", { currentPassword: "Wrong password" })
    }
    repo.setPassword(user.id, await hashPassword(input.newPassword))
    destroyUserSessions(deps.db, user.id)
    const token = createSession(deps.db, user.id, deps.now())
    setCookie(c, SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: "Lax",
      secure: deps.config.cookieSecure,
      path: "/",
      maxAge: SESSION_DAYS * 86_400,
    })
    return c.json({ ok: true })
  })

  return app
}
