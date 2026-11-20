import { initials } from '@/lib/format'
import { cx } from '@/lib/utils'

export type AvatarSize = 'xs' | 'sm' | 'md'

const sizes: Record<AvatarSize, string> = {
  xs: 'size-6 text-[10px]',
  sm: 'size-7 text-[11px]',
  md: 'size-9 text-xs',
}

export interface UserAvatarProps {
  name: string
  color: string
  size?: AvatarSize
  /** Highlights the current user in presence stacks. */
  self?: boolean
  className?: string
}

/**
 * Initials avatar colored with the account's deterministic HSL color — the
 * same color used for the person's live cursor in the editor.
 */
export function UserAvatar({ name, color, size = 'md', self, className }: UserAvatarProps) {
  return (
    <span
      className={cx(
        'inline-flex shrink-0 select-none items-center justify-center rounded-full font-semibold text-white',
        sizes[size],
        self && 'ring-2 ring-primary ring-offset-2 ring-offset-background',
        className,
      )}
      style={{ backgroundColor: color }}
      title={name}
      aria-label={name}
    >
      {initials(name)}
    </span>
  )
}
