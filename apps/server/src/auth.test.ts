import { describe, expect, it } from "vitest"
import { Client, addUser, makeEnv } from "./test-utils"

describe("auth", () => {
  it("rejects unauthenticated requests", async () => {
    const env = makeEnv()
    const res = await new Client(env).request("GET", "/clients")
    expect(res.status).toBe(401)
  })

  it("logs in, reads /me and logs out", async () => {
    const env = makeEnv()
    await addUser(env, "Demo", "Demo Studio")
    const api = new Client(env)
    expect((await api.login("demo")).status).toBe(200)
    const me = await api.json<{
      user: { username: string }
      workspace: { name: string }
    }>("GET", "/auth/me")
    expect(me.status).toBe(200)
    expect(me.body.user.username).toBe("demo")
    expect(me.body.workspace.name).toBe("Demo Studio")
    await api.request("POST", "/auth/logout")
    expect((await api.json("GET", "/auth/me")).status).toBe(401)
  })

  it("sets an httpOnly SameSite=Lax cookie", async () => {
    const env = makeEnv()
    await addUser(env, "demo", "Demo")
    const res = await new Client(env).login("demo")
    const cookie = res.headers.get("set-cookie") ?? ""
    expect(cookie).toMatch(/HttpOnly/i)
    expect(cookie).toMatch(/SameSite=Lax/i)
  })

  it("rejects wrong passwords without revealing which part was wrong", async () => {
    const env = makeEnv()
    await addUser(env, "demo", "Demo")
    const res = await new Client(env).login("demo", "wrong-password")
    expect(res.status).toBe(401)
    expect((await new Client(env).login("nobody")).status).toBe(401)
  })

  it("rate limits after 5 failures", async () => {
    const env = makeEnv()
    await addUser(env, "demo", "Demo")
    const api = new Client(env)
    for (let i = 0; i < 5; i++)
      expect((await api.login("demo", "bad")).status).toBe(401)
    expect((await api.login("demo", "bad")).status).toBe(429)
    expect((await api.login("demo")).status).toBe(429)
  })

  it("expires sessions after 30 days of inactivity and slides otherwise", async () => {
    const env = makeEnv("2026-01-01T00:00:00Z")
    await addUser(env, "demo", "Demo")
    const api = new Client(env)
    await api.login("demo")
    env.clock.now = new Date("2026-01-25T00:00:00Z")
    expect((await api.json("GET", "/auth/me")).status).toBe(200)
    env.clock.now = new Date("2026-02-20T00:00:00Z")
    expect((await api.json("GET", "/auth/me")).status).toBe(200)
    env.clock.now = new Date("2026-04-01T00:00:00Z")
    expect((await api.json("GET", "/auth/me")).status).toBe(401)
  })

  it("changes the password", async () => {
    const env = makeEnv()
    await addUser(env, "demo", "Demo")
    const api = new Client(env)
    await api.login("demo")
    const bad = await api.json("POST", "/auth/change-password", {
      currentPassword: "nope",
      newPassword: "newpassword1",
    })
    expect(bad.status).toBe(422)
    const ok = await api.json("POST", "/auth/change-password", {
      currentPassword: "password123",
      newPassword: "newpassword1",
    })
    expect(ok.status).toBe(200)
    expect((await new Client(env).login("demo", "password123")).status).toBe(
      401
    )
    expect((await new Client(env).login("demo", "newpassword1")).status).toBe(
      200
    )
  })

  it("blocks cross-origin mutating requests", async () => {
    const env = makeEnv()
    await addUser(env, "demo", "Demo")
    const res = await new Client(env).request(
      "POST",
      "/auth/login",
      { username: "demo", password: "password123" },
      { origin: "http://evil.example", host: "localhost" }
    )
    expect(res.status).toBe(403)
  })

  it("lets several logins share one workspace but never two workspaces per login", async () => {
    const env = makeEnv()
    const first = await addUser(env, "a", "Shared")
    const second = await (async () => {
      const { createUser } = await import("./services/users")
      return createUser(
        env.db,
        {
          username: "b",
          password: "password123",
          workspaceId: first.workspace.id,
          timezone: "Asia/Kolkata",
        },
        env.clock.now
      )
    })()
    expect(second.workspace.id).toBe(first.workspace.id)
    await expect(addUser(env, "a", "Other")).rejects.toThrow(/already exists/)
  })
})
