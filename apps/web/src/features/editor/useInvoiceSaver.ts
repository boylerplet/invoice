import { useCallback, useEffect, useRef } from "react"
import { toast } from "sonner"
import { ApiError } from "@/lib/api"
import { useSaveInvoice } from "@/lib/invoiceQueries"
import { selectDirty, useEditorStore } from "./editorStore"

export const AUTOSAVE_MS = 800

/**
 * Saves the draft document to the server.
 * - `flush()` saves immediately and resolves true on success.
 * - With `autosave` on (DRAFT), changes are saved 800 ms after the last edit.
 */
export function useInvoiceSaver(invoiceId: string, autosave: boolean) {
  const mutation = useSaveInvoice(invoiceId)
  const inFlight = useRef(false)
  const mutateAsync = mutation.mutateAsync

  const flush = useCallback(
    async (changeNote?: string | null): Promise<boolean> => {
      const state = useEditorStore.getState()
      if (!state.doc) return false
      if (state.rev === state.savedRev) return true
      if (inFlight.current) return false
      inFlight.current = true
      const { rev, doc } = state
      state.saving()
      try {
        await mutateAsync({ doc, changeNote })
        useEditorStore.getState().saved(rev, new Date().toISOString())
        return true
      } catch (error) {
        const message =
          error instanceof ApiError ? error.message : "Could not save"
        useEditorStore.getState().failed(message)
        toast.error(message)
        return false
      } finally {
        inFlight.current = false
      }
    },
    [mutateAsync]
  )

  const rev = useEditorStore((s) => s.rev)
  const dirty = useEditorStore(selectDirty)
  const saveState = useEditorStore((s) => s.saveState)

  useEffect(() => {
    // After a failed save, wait for the user's retry instead of looping.
    if (!autosave || !dirty || saveState === "error") return
    const timer = setTimeout(() => void flush(), AUTOSAVE_MS)
    return () => clearTimeout(timer)
  }, [autosave, dirty, rev, saveState, flush])

  return { flush, saving: mutation.isPending }
}
