import { createHmac, timingSafeEqual } from "node:crypto"

export const PRINT_TOKEN_TTL_MS = 60_000

interface Claims {
  ws: string
  id: string
  rev: number
  exp: number
}

const sign = (secret: string, payload: string) =>
  createHmac("sha256", secret).update(payload).digest("base64url")

/** Short-lived token that lets the headless browser read one invoice, with no session cookie. */
export function signPrintToken(
  secret: string,
  claims: Omit<Claims, "exp">,
  now: Date,
  ttlMs = PRINT_TOKEN_TTL_MS
): string {
  const payload = Buffer.from(
    JSON.stringify({ ...claims, exp: now.getTime() + ttlMs })
  ).toString("base64url")
  return `${payload}.${sign(secret, payload)}`
}

/** Returns the claims when the token is authentic, unexpired and issued for this invoice; otherwise null. */
export function verifyPrintToken(
  secret: string,
  token: string,
  invoiceId: string,
  now: Date
): Pick<Claims, "ws" | "rev"> | null {
  const [payload, signature] = token.split(".")
  if (!payload || !signature) return null
  const expected = Buffer.from(sign(secret, payload))
  const given = Buffer.from(signature)
  if (expected.length !== given.length || !timingSafeEqual(expected, given))
    return null
  try {
    const claims = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8")
    ) as Claims
    if (claims.id !== invoiceId || claims.exp < now.getTime()) return null
    return { ws: claims.ws, rev: claims.rev }
  } catch {
    return null
  }
}
