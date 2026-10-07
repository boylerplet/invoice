const THUMBNAILS = import.meta.glob("./templates/*/v*/assets/thumbnail.png", {
  query: "?url",
  import: "default",
  eager: true,
}) as Record<string, string>

/** Gallery thumbnail written by `pnpm template:shots <id> --thumb`, or null if none exists yet. */
export function templateThumbnail(id: string, version: number): string | null {
  return (
    THUMBNAILS[`./templates/${id}/v${version}/assets/thumbnail.png`] ?? null
  )
}
