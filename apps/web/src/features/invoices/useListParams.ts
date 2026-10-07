import { useCallback, useMemo } from "react"
import { useSearchParams } from "react-router"

export const FILTER_KEYS = ["q", "status", "clientId", "profileId", "currency", "from", "to", "sort"] as const
export type FilterKey = (typeof FILTER_KEYS)[number]

/** All list state lives in the URL query string, so a filtered list can be bookmarked and shared. */
export function useListParams() {
  const [search, setSearch] = useSearchParams()

  const filters = useMemo(() => {
    const out: Partial<Record<FilterKey, string>> = {}
    for (const key of FILTER_KEYS) {
      const value = search.get(key)
      if (value) out[key] = value
    }
    return out
  }, [search])

  const set = useCallback(
    (patch: Record<string, string | undefined>) => {
      setSearch(
        (prev) => {
          const next = new URLSearchParams(prev)
          for (const [key, value] of Object.entries(patch)) {
            if (value === undefined || value === "") next.delete(key)
            else next.set(key, value)
          }
          return next
        },
        { replace: true }
      )
    },
    [setSearch]
  )

  const clear = useCallback(() => set(Object.fromEntries(FILTER_KEYS.map((k) => [k, undefined]))), [set])

  return { filters, search, set, clear, hasFilters: Object.keys(filters).length > 0 }
}
