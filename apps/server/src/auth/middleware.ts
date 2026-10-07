import { getCookie } from "hono/cookie"
import { createMiddleware } from "hono/factory"
import { ApiError } from "../http/errors"
import type { AppEnv, Deps } from "../http/types"
import { resolveSession } from "./sessions"

export const SESSION_COOKIE = "sid"

export function requireAuth(deps: Deps) {
  return createMiddleware<AppEnv>(async (c, next) => {
    const token = getCookie(c, SESSION_COOKIE)
    const auth = token ? resolveSession(deps.db, token, deps.now()) : null
    if (!auth) throw new ApiError(401, "UNAUTHENTICATED", "Please sign in")
    c.set("auth", auth)
    await next()
  })
}

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"])

/** CSRF defence on top of SameSite=Lax: a mutating request's Origin must match Host. */
export function originCheck(deps: Deps) {
  return createMiddleware(async (c, next) => {
    if (!SAFE_METHODS.has(c.req.method)) {
      const origin = c.req.header("origin")
      if (origin && !deps.config.allowedOrigins.includes(origin)) {
        const host = c.req.header("host")
        if (!host || new URL(origin).host !== host) {
          throw new ApiError(403, "BAD_ORIGIN", "Cross-origin request blocked")
        }
      }
    }
    await next()
  })
}
