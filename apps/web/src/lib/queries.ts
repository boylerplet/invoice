import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryKey,
  type UseMutationOptions,
} from "@tanstack/react-query"
import type {
  ClientDto,
  ClientInput,
  IssuerProfileDto,
  IssuerProfileInput,
  MeDto,
  PaymentAccountDto,
  PaymentAccountInput,
  WorkspaceDto,
  WorkspaceUpdate,
} from "@workspace/shared"
import { api, type ApiError } from "./api"

export const keys = {
  me: ["me"] as const,
  profiles: ["profiles"] as const,
  accounts: ["payment-accounts"] as const,
  clients: ["clients"] as const,
  client: (id: string) => ["clients", id] as const,
}

export const useMe = () =>
  useQuery({ queryKey: keys.me, queryFn: () => api.get<MeDto>("/auth/me"), retry: false, staleTime: 60_000 })

export const useProfiles = () =>
  useQuery({ queryKey: keys.profiles, queryFn: () => api.get<IssuerProfileDto[]>("/issuer-profiles?archived=true") })

export const useAccounts = () =>
  useQuery({ queryKey: keys.accounts, queryFn: () => api.get<PaymentAccountDto[]>("/payment-accounts?archived=true") })

export const useClients = () =>
  useQuery({ queryKey: keys.clients, queryFn: () => api.get<ClientDto[]>("/clients?archived=true") })

/** Mutation that invalidates the given query keys on success. */
export function useApiMutation<TData, TVars>(
  fn: (vars: TVars) => Promise<TData>,
  invalidate: QueryKey[],
  options: Omit<UseMutationOptions<TData, ApiError, TVars>, "mutationFn"> = {}
) {
  const client = useQueryClient()
  return useMutation<TData, ApiError, TVars>({
    ...options,
    mutationFn: fn,
    onSuccess: async (...args) => {
      await Promise.all(invalidate.map((queryKey) => client.invalidateQueries({ queryKey })))
      await options.onSuccess?.(...args)
    },
  })
}

export const useSaveWorkspace = () =>
  useApiMutation((input: WorkspaceUpdate) => api.put<WorkspaceDto>("/workspace", input), [keys.me])

export const useSaveProfile = () =>
  useApiMutation(
    (v: { id?: string; input: IssuerProfileInput }) =>
      v.id ? api.put<IssuerProfileDto>(`/issuer-profiles/${v.id}`, v.input) : api.post<IssuerProfileDto>("/issuer-profiles", v.input),
    [keys.profiles]
  )

export const useArchiveProfile = () =>
  useApiMutation(
    (v: { id: string; archived: boolean }) => api.post(`/issuer-profiles/${v.id}/${v.archived ? "unarchive" : "archive"}`),
    [keys.profiles]
  )

export const useUploadLogo = () =>
  useApiMutation((v: { id: string; file: File }) => api.upload<IssuerProfileDto>(`/issuer-profiles/${v.id}/logo`, v.file), [keys.profiles])

export const useRemoveLogo = () =>
  useApiMutation((id: string) => api.delete<IssuerProfileDto>(`/issuer-profiles/${id}/logo`), [keys.profiles])

export const useSaveAccount = () =>
  useApiMutation(
    (v: { id?: string; input: PaymentAccountInput }) =>
      v.id ? api.put<PaymentAccountDto>(`/payment-accounts/${v.id}`, v.input) : api.post<PaymentAccountDto>("/payment-accounts", v.input),
    [keys.accounts]
  )

export const useArchiveAccount = () =>
  useApiMutation(
    (v: { id: string; archived: boolean }) => api.post(`/payment-accounts/${v.id}/${v.archived ? "unarchive" : "archive"}`),
    [keys.accounts]
  )

export const useSaveClient = () =>
  useApiMutation(
    (v: { id?: string; input: ClientInput }) =>
      v.id ? api.put<ClientDto>(`/clients/${v.id}`, v.input) : api.post<ClientDto>("/clients", v.input),
    [keys.clients]
  )

export const useArchiveClient = () =>
  useApiMutation(
    (v: { id: string; archived: boolean }) => api.post(`/clients/${v.id}/${v.archived ? "unarchive" : "archive"}`),
    [keys.clients]
  )
