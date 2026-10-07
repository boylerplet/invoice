import type { FieldValues, Path, UseFormSetError } from "react-hook-form"
import { toast } from "sonner"
import { ApiError } from "@/lib/api"

/** Maps a server validation error onto form fields, or shows a toast for anything else. */
export function applyServerErrors<T extends FieldValues>(error: unknown, setError: UseFormSetError<T>): void {
  if (error instanceof ApiError && error.fields) {
    for (const [path, message] of Object.entries(error.fields)) {
      setError(path as Path<T>, { type: "server", message })
    }
    toast.error(error.message)
    return
  }
  toast.error(error instanceof Error ? error.message : "Something went wrong")
}
