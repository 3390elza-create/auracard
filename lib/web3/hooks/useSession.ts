'use client'

import { useQuery } from '@tanstack/react-query'
import type { Address, SessionState } from '@/lib/web3/types'

interface MeResponse { address: Address; chainId: number }

async function fetchSession(): Promise<MeResponse | null> {
  const res = await fetch('/api/auth/me', { credentials: 'same-origin' })
  if (res.status === 401) return null
  if (!res.ok) throw new Error('me_failed')
  return res.json() as Promise<MeResponse>
}

export function useSession(): SessionState {
  const { data, isLoading } = useQuery({
    queryKey: ['session'],
    queryFn: fetchSession,
    staleTime: 60_000,
    refetchOnWindowFocus: true,
    retry: false,
  })
  if (isLoading) return { status: 'loading' }
  if (!data) return { status: 'unauthenticated' }
  return { status: 'authenticated', address: data.address, chainId: data.chainId }
}
