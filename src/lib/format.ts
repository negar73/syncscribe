/** Presentation helpers shared across pages and components. */

/** "just now" · "5m ago" · "3h ago" · "2d ago" · localized date for older items. */
export function timeAgo(isoDate: string): string {
  const date = new Date(isoDate)
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000)

  if (seconds < 45) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

/** "Ada Lovelace" → "AL" — used inside colored presence avatars. */
export function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('')
}
