'use client'

import { useQueryClient } from '@tanstack/react-query'
import { useDisconnect as useWagmiDisconnect } from 'wagmi'

export function useDisconnect() {
  const queryClient = useQueryClient()
  const { disconnect } = useWagmiDisconnect()

  return async function logout(): Promise<void> {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' })
    } catch {
      // server unreachable — proceed with client-side disconnect anyway
    }
    disconnect()
    await queryClient.invalidateQueries({ queryKey: ['session'] })
  }
}
