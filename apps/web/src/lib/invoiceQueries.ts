import { useQuery, useQueryClient } from "@tanstack/react-query"
import type {
  ActivityPageDto,
  CancelInput,
  DashboardDto,
  InvoiceDetailDto,
  InvoiceDoc,
  InvoiceListDto,
  PayInput,
  RevisionDto,
  RevisionSummaryDto,
} from "@workspace/shared"
import { api, queryString } from "./api"
import { keys, useApiMutation } from "./queries"

export const invoiceKeys = {
  all: ["invoices"] as const,
  list: (params: Record<string, string | undefined>) => ["invoices", "list", params] as const,
  detail: (id: string) => ["invoices", "detail", id] as const,
  revisions: (id: string) => ["invoices", "revisions", id] as const,
  revision: (id: string, rev: number) => ["invoices", "revision", id, rev] as const,
  dashboard: ["dashboard"] as const,
  activity: ["activity"] as const,
}

export const useInvoice = (id: string) =>
  useQuery({ queryKey: invoiceKeys.detail(id), queryFn: () => api.get<InvoiceDetailDto>(`/invoices/${id}`), staleTime: 0 })

export const useInvoiceList = (params: Record<string, string | undefined>) =>
  useQuery({
    queryKey: invoiceKeys.list(params),
    queryFn: () => api.get<InvoiceListDto>(`/invoices${queryString(params)}`),
    placeholderData: (previous) => previous,
  })

export const useRevisions = (id: string) =>
  useQuery({ queryKey: invoiceKeys.revisions(id), queryFn: () => api.get<RevisionSummaryDto[]>(`/invoices/${id}/revisions`) })

export const useRevision = (id: string, rev: number | null) =>
  useQuery({
    queryKey: invoiceKeys.revision(id, rev ?? 0),
    enabled: rev !== null,
    queryFn: () => api.get<RevisionDto>(`/invoices/${id}/revisions/${rev}`),
  })

export const useDashboard = () => useQuery({ queryKey: invoiceKeys.dashboard, queryFn: () => api.get<DashboardDto>("/dashboard") })

export const useActivity = (cursor: string | null) =>
  useQuery({
    queryKey: [...invoiceKeys.activity, cursor],
    queryFn: () => api.get<ActivityPageDto>(`/activity${queryString({ cursor })}`),
    placeholderData: (previous) => previous,
  })

/** Everything that depends on invoice data is refreshed after a change. */
const AFFECTED = [invoiceKeys.all, invoiceKeys.dashboard, invoiceKeys.activity, keys.clients]

export const useCreateInvoice = () =>
  useApiMutation((v: { clientId: string; issuerProfileId?: string }) => api.post<InvoiceDetailDto>("/invoices", v), AFFECTED)

export function useSaveInvoice(id: string) {
  const client = useQueryClient()
  return useApiMutation(
    (v: { doc: InvoiceDoc; changeNote?: string | null }) => api.put<InvoiceDetailDto>(`/invoices/${id}`, v),
    [],
    {
      onSuccess: (detail) => {
        client.setQueryData(invoiceKeys.detail(id), detail)
        void client.invalidateQueries({ queryKey: ["invoices", "list"] })
        void client.invalidateQueries({ queryKey: invoiceKeys.revisions(id) })
        void client.invalidateQueries({ queryKey: invoiceKeys.dashboard })
      },
    }
  )
}

/** Row-level actions, used by the editor and by the lists. */
export const useInvoiceAction = () =>
  useApiMutation(
    (v: { id: string; action: "duplicate" | "discard" | "restore" | "reopen" | "issue"; body?: unknown }) =>
      api.post<InvoiceDetailDto>(`/invoices/${v.id}/${v.action}`, v.body),
    AFFECTED
  )

export const usePayAction = () =>
  useApiMutation((v: { id: string; input: PayInput }) => api.post<InvoiceDetailDto>(`/invoices/${v.id}/pay`, v.input), AFFECTED)

export const useCancelAction = () =>
  useApiMutation((v: { id: string; input: CancelInput }) => api.post<InvoiceDetailDto>(`/invoices/${v.id}/cancel`, v.input), AFFECTED)
