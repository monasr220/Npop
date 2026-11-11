/** Small presentation helpers shared across the UI. */

export function formatDuration(totalSeconds: number | null | undefined): string {
  const total = Math.max(0, Math.floor(Number(totalSeconds) || 0))
  const minutes = Math.floor(total / 60)
  const seconds = total % 60
  return `${minutes}:${String(seconds).padStart(2, "0")}`
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return ""
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

export function formatRelative(value: string | null | undefined): string {
  if (!value) return ""
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""
  const seconds = Math.round((Date.now() - date.getTime()) / 1000)
  if (seconds < 60) return "just now"
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.round(hours / 24)
  if (days < 7) return `${days}d ago`
  return formatDate(value)
}

export function initials(name: string | null | undefined): string {
  const clean = (name || "?").trim()
  const parts = clean.split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export function pluralize(count: number, singular: string, plural?: string) {
  return count === 1 ? singular : plural ?? `${singular}s`
}

export function formatCount(value: number | null | undefined): string {
  const count = Math.max(0, Number(value) || 0)
  if (count < 1_000) return String(count)
  if (count < 1_000_000) {
    const thousands = count / 1_000
    return `${thousands >= 100 ? Math.round(thousands) : thousands.toFixed(1)}K`
  }
  const millions = count / 1_000_000
  return `${millions >= 100 ? Math.round(millions) : millions.toFixed(1)}M`
}

/** Deterministic on-brand artwork placeholder, derived from a string.
 *  Only the three brand colours (and neutral shades) are used, so no random
 *  hues leak into the interface. */
const ARTWORK_GRADIENTS = [
  "linear-gradient(135deg, rgb(var(--brand-solid)) 0%, rgb(var(--ink)) 100%)",
  "linear-gradient(135deg, rgb(var(--ink)) 0%, rgb(var(--brand-solid)) 100%)",
  "linear-gradient(135deg, rgb(var(--brand-solid)) 0%, rgb(var(--ink-soft)) 100%)",
  "linear-gradient(135deg, rgb(var(--ink-soft)) 0%, rgb(var(--brand-solid)) 100%)",
  "linear-gradient(135deg, rgb(var(--ink)) 0%, rgb(var(--brand-solid)) 55%, rgb(var(--ink-soft)) 100%)",
]

export function gradientFor(seed: string): string {
  let hash = 0
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) % 9973
  }
  return ARTWORK_GRADIENTS[hash % ARTWORK_GRADIENTS.length]
}
