import type { InvoiceDoc } from "@workspace/shared"
import { create } from "zustand"

export type SaveState = "idle" | "saving" | "saved" | "error"

interface EditorState {
  invoiceId: string | null
  /** The document being edited. Every form change replaces it; the preview renders from it. */
  doc: InvoiceDoc | null
  /** Increments with each local change. */
  rev: number
  /** The `rev` last confirmed by the server. */
  savedRev: number
  saveState: SaveState
  saveError: string | null
  savedAt: string | null
  /** Show inline validation messages (after a failed issue attempt, or for issued invoices). */
  showErrors: boolean
  load: (invoiceId: string, doc: InvoiceDoc) => void
  update: (change: (doc: InvoiceDoc) => InvoiceDoc) => void
  saving: () => void
  saved: (rev: number, at: string) => void
  failed: (message: string) => void
  setShowErrors: (show: boolean) => void
  reset: () => void
}

const initial = {
  invoiceId: null,
  doc: null,
  rev: 0,
  savedRev: 0,
  saveState: "idle" as SaveState,
  saveError: null,
  savedAt: null,
  showErrors: false,
}

export const useEditorStore = create<EditorState>((set) => ({
  ...initial,
  load: (invoiceId, doc) => set({ ...initial, invoiceId, doc }),
  update: (change) =>
    set((state) =>
      state.doc
        ? { doc: change(state.doc), rev: state.rev + 1, saveState: "idle" }
        : state
    ),
  saving: () => set({ saveState: "saving", saveError: null }),
  saved: (rev, at) =>
    set({ savedRev: rev, saveState: "saved", saveError: null, savedAt: at }),
  failed: (message) => set({ saveState: "error", saveError: message }),
  setShowErrors: (showErrors) => set({ showErrors }),
  reset: () => set(initial),
}))

export const selectDirty = (s: EditorState): boolean => s.rev !== s.savedRev
