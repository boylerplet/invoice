import type { Db } from "../db/client"

type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0]

/** Either the root database or a transaction handle. */
export type DbLike = Db | Tx

export const newId = (): string => crypto.randomUUID()
