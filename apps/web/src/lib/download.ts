import { ApiError } from "./api"

/** Reads the file name from a Content-Disposition header (RFC 5987 form first). */
export function filenameFromDisposition(header: string | null): string | null {
  if (!header) return null
  const encoded = /filename\*=UTF-8''([^;]+)/i.exec(header)?.[1]
  if (encoded) return decodeURIComponent(encoded)
  return /filename="([^"]+)"/i.exec(header)?.[1] ?? null
}

/** Fetches a file with the session cookie and saves it through the browser. Failures throw ApiError. */
export async function downloadFile(
  path: string,
  fallbackName: string
): Promise<string> {
  const res = await fetch(`/api${path}`, { credentials: "same-origin" })
  if (!res.ok) {
    let message = res.statusText
    let code = "ERROR"
    try {
      const body = (await res.json()) as {
        error?: { code?: string; message?: string }
      }
      message = body.error?.message ?? message
      code = body.error?.code ?? code
    } catch {
      // The body was not JSON; keep the status text.
    }
    throw new ApiError(res.status, code, message)
  }
  const blob = await res.blob()
  const name =
    filenameFromDisposition(res.headers.get("content-disposition")) ??
    fallbackName
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = name
  document.body.append(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
  return name
}
