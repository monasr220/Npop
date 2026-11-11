/** Presentation and safety helpers that are not already in `format.ts`. */

/** Allow only absolute http(s) links from user-supplied data. */
export function safeExternalUrl(value: string | null | undefined): string | null {
  if (!value) return null
  try {
    const url = new URL(value)
    if (url.protocol === "http:" || url.protocol === "https:") return url.toString()
    return null
  } catch {
    return null
  }
}

/** Normalise a social link: accept bare domains and add https://. */
export function normalizeExternalUrl(value: string): string | null {
  const trimmed = value.trim()
  if (!trimmed) return null
  const withProtocol = /^[a-z][a-z0-9+.-]*:/i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`
  return safeExternalUrl(withProtocol)
}
