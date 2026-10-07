import { create } from "zustand"

export type FitMode = "width" | "page" | "custom"

export const MIN_ZOOM = 0.25
export const MAX_ZOOM = 3
export const ZOOM_STEPS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 3]

const clamp = (zoom: number) =>
  Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.round(zoom * 100) / 100))

interface PreviewState {
  zoom: number
  fit: FitMode
  /** Page currently most visible in the scroll area (1-based). */
  page: number
  setZoom: (zoom: number) => void
  zoomBy: (factor: number) => void
  setFit: (fit: FitMode, zoom: number) => void
  setPage: (page: number) => void
}

export const usePreviewStore = create<PreviewState>((set) => ({
  zoom: 1,
  fit: "width",
  page: 1,
  setZoom: (zoom) => set({ zoom: clamp(zoom), fit: "custom" }),
  zoomBy: (factor) =>
    set((s) => ({ zoom: clamp(s.zoom * factor), fit: "custom" })),
  setFit: (fit, zoom) => set({ fit, zoom: clamp(zoom) }),
  setPage: (page) => set({ page }),
}))

/** Next zoom step above or below the current zoom, for the +/- buttons. */
export function stepZoom(current: number, direction: 1 | -1): number {
  if (direction === 1)
    return ZOOM_STEPS.find((z) => z > current + 0.001) ?? MAX_ZOOM
  return [...ZOOM_STEPS].reverse().find((z) => z < current - 0.001) ?? MIN_ZOOM
}
