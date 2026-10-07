import { set, type FieldErrors, type FieldValues, type Resolver } from "react-hook-form"
import type { ZodType } from "zod"

/**
 * Validates the form with a shared zod schema after converting the form values to the API payload.
 * Issue paths are applied to the form's field errors, so keep payload and form field names aligned.
 */
export function payloadResolver<V extends FieldValues, P>(
  schema: ZodType<P>,
  toPayload: (values: V) => unknown,
  mapPath: (path: string) => string = (path) => path
): Resolver<V> {
  return async (values) => {
    const result = schema.safeParse(toPayload(values))
    if (result.success) return { values, errors: {} }
    const errors: FieldErrors<V> = {}
    for (const issue of result.error.issues) {
      const path = mapPath(issue.path.join("."))
      if (path !== "") set(errors, path, { type: issue.code, message: issue.message })
    }
    return { values: {}, errors }
  }
}

/** Blank text becomes null (the API stores absent values as null). */
export const toNull = (value: string): string | null => (value.trim() === "" ? null : value.trim())

export const linesToText = (lines: string[]): string => lines.join("\n")

export const textToLines = (text: string): string[] =>
  text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line !== "")
