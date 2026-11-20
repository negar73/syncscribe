/** Tiny className joiner — keeps component call-sites tidy without extra deps. */
export function cx(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ')
}
