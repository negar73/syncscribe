/**
 * Deterministic user colors.
 *
 * Every account gets a stable HSL color derived from a hash of its email
 * address, so the same person always renders with the same color across
 * presence cursors, avatars and badges — no extra state required.
 */

const HUE_COUNT = 360
const SATURATION = 0.62
const LIGHTNESS = 0.45

export function hslColorFromSeed(seed: string): string {
  let hash = 0
  for (const char of seed) {
    hash = (hash * 31 + (char.codePointAt(0) ?? 0)) | 0
  }
  const hue = Math.abs(hash) % HUE_COUNT
  return `hsl(${hue} ${Math.round(SATURATION * 100)}% ${Math.round(LIGHTNESS * 100)}%)`
}
