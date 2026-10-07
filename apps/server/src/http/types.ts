import type { Config } from "../config"
import type { Db } from "../db/client"

export interface AuthContext {
  userId: string
  workspaceId: string
  username: string
}

export interface AppEnv {
  Variables: { auth: AuthContext }
}

export interface Deps {
  config: Config
  db: Db
  now: () => Date
}
