/**
 * Trigger a browser download for a Blob with a chosen filename.
 * Cleans up the object URL after the click.
 */
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  // Revoke after the click handler has had a chance to fire.
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/**
 * Build a filesystem-safe filename slug from the report context.
 *   helpxs-internal-quarter-2026-05-03.pdf
 */
export function reportFilename({
  orgName,
  audienceLabel,
  windowLabel,
  ext,
  generatedAt,
}: {
  orgName: string
  audienceLabel: string
  windowLabel: string
  ext: "pdf" | "pptx"
  generatedAt: Date
}) {
  const slug = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
  const ymd = generatedAt.toISOString().slice(0, 10)
  return `${slug(orgName)}-${slug(audienceLabel)}-${slug(windowLabel)}-${ymd}.${ext}`
}
