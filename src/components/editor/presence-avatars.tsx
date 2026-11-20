'use client'

import { useEffect, useState } from 'react'
import type { WebsocketProvider } from 'y-websocket'

import { UserAvatar } from '@/components/ui/avatar'

interface AwarenessUser {
  name: string
  color: string
}

interface Peer {
  clientID: number
  name: string
  color: string
  self: boolean
}

const MAX_VISIBLE = 4

/**
 * Presence stack fed by the Yjs awareness channel. Each connected browser
 * advertises `{ user: { name, color } }`; the server relays awareness
 * updates between all sockets, so everyone sees the same roster.
 */
export function PresenceAvatars({
  provider,
  selfUser,
}: {
  provider: WebsocketProvider
  selfUser: AwarenessUser
}) {
  const [peers, setPeers] = useState<Peer[]>([])

  useEffect(() => {
    const awareness = provider.awareness

    const readStates = () => {
      const list: Peer[] = []
      awareness.getStates().forEach((state, clientID) => {
        const user = (state as { user?: Partial<AwarenessUser> }).user
        if (user && typeof user.name === 'string' && typeof user.color === 'string') {
          list.push({
            clientID,
            name: user.name,
            color: user.color,
            self: clientID === awareness.clientID,
          })
        }
      })
      // The current user first, then alphabetical.
      list.sort((a, b) => Number(b.self) - Number(a.self) || a.name.localeCompare(b.name))
      setPeers(list)
    }

    readStates()
    awareness.on('update', readStates)
    return () => {
      awareness.off('update', readStates)
    }
  }, [provider, selfUser.name, selfUser.color])

  const visible = peers.slice(0, MAX_VISIBLE)
  const hidden = peers.length - visible.length

  return (
    <div
      className="flex items-center -space-x-2"
      role="list"
      aria-label={`${peers.length} people in this document`}
    >
      {visible.map((peer) => (
        <span key={peer.clientID} role="listitem" title={peer.self ? `${peer.name} (you)` : peer.name}>
          <UserAvatar name={peer.name} color={peer.color} size="sm" self={peer.self} />
        </span>
      ))}
      {hidden > 0 ? (
        <span
          className="inline-flex size-7 items-center justify-center rounded-full border bg-secondary text-[10px] font-semibold text-secondary-foreground"
          title={`${hidden} more`}
        >
          +{hidden}
        </span>
      ) : null}
    </div>
  )
}
