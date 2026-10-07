import type { Context } from "hono"
import type { ZodType } from "zod"
import { ApiError, parse } from "./errors"

/** Read and validate a JSON request body. */
export async function jsonBody<T>(c: Context, schema: ZodType<T>): Promise<T> {
  let raw: unknown
  try {
    raw = await c.req.json()
  } catch {
    throw new ApiError(400, "BAD_JSON", "Request body must be valid JSON")
  }
  return parse(schema, raw)
}
