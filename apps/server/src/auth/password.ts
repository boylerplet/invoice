import { hash, verify } from "@node-rs/argon2"

/** argon2id is the default algorithm of @node-rs/argon2. */
export function hashPassword(password: string): Promise<string> {
  return hash(password)
}

export async function verifyPassword(hashed: string, password: string): Promise<boolean> {
  try {
    return await verify(hashed, password)
  } catch {
    return false
  }
}
