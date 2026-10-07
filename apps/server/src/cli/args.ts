/** Minimal `--key value` / `--flag` parser for the CLI scripts. */
export function parseArgs(argv: string[]): Record<string, string | true> {
  const out: Record<string, string | true> = {}
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (!arg?.startsWith("--")) continue
    const key = arg.slice(2)
    const next = argv[i + 1]
    if (next === undefined || next.startsWith("--")) {
      out[key] = true
    } else {
      out[key] = next
      i += 1
    }
  }
  return out
}

export function stringArg(
  args: Record<string, string | true>,
  key: string
): string | undefined {
  const value = args[key]
  return typeof value === "string" ? value : undefined
}
