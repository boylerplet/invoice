import type { ZodType } from "zod"

export type ErrorStatus = 400 | 401 | 403 | 404 | 409 | 413 | 415 | 422 | 429 | 500

export class ApiError extends Error {
  constructor(
    readonly status: ErrorStatus,
    readonly code: string,
    message: string,
    readonly fields?: Record<string, string>
  ) {
    super(message)
    this.name = "ApiError"
  }
}

export const notFound = (what: string) =>
  new ApiError(404, "NOT_FOUND", `${what} not found`)

/** Parse untrusted input with zod; failures become a 422 with per-field messages. */
export function parse<T>(schema: ZodType<T>, data: unknown): T {
  const result = schema.safeParse(data)
  if (result.success) return result.data
  const fields: Record<string, string> = {}
  for (const issue of result.error.issues) {
    const key = issue.path.join(".") || "_"
    fields[key] ??= issue.message
  }
  throw new ApiError(422, "VALIDATION", "Please check the highlighted fields", fields)
}
