export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly fields?: Record<string, string>
  ) {
    super(message)
    this.name = "ApiError"
  }
}

type Handler = () => void
let onUnauthorized: Handler = () => {}

/** The router registers a redirect to /login here. */
export function setUnauthorizedHandler(handler: Handler): void {
  onUnauthorized = handler
}

async function parseError(res: Response): Promise<ApiError> {
  try {
    const body = (await res.json()) as { error?: { code?: string; message?: string; fields?: Record<string, string> } }
    return new ApiError(res.status, body.error?.code ?? "ERROR", body.error?.message ?? res.statusText, body.error?.fields)
  } catch {
    return new ApiError(res.status, "ERROR", res.statusText || "Request failed")
  }
}

async function send<T>(method: string, path: string, init: { body?: BodyInit; headers?: Record<string, string> } = {}): Promise<T> {
  const res = await fetch(`/api${path}`, { method, credentials: "same-origin", ...init })
  if (!res.ok) {
    const error = await parseError(res)
    if (error.status === 401 && error.code === "UNAUTHENTICATED") onUnauthorized()
    throw error
  }
  return (await res.json()) as T
}

const json = (body: unknown) => ({ body: JSON.stringify(body), headers: { "Content-Type": "application/json" } })

export const api = {
  get: <T>(path: string) => send<T>("GET", path),
  post: <T>(path: string, body?: unknown) => send<T>("POST", path, body === undefined ? {} : json(body)),
  put: <T>(path: string, body: unknown) => send<T>("PUT", path, json(body)),
  delete: <T>(path: string) => send<T>("DELETE", path),
  upload: <T>(path: string, file: File) => {
    const form = new FormData()
    form.append("file", file)
    return send<T>("POST", path, { body: form })
  },
}

export function queryString(params: Record<string, string | number | boolean | undefined | null>): string {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") search.set(key, String(value))
  }
  const text = search.toString()
  return text ? `?${text}` : ""
}
