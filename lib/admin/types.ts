import type { CardStatus } from '@prisma/client'

export interface AdminUserRow {
  walletAddress: string
  chainId: number
  walletProvider: string | null // connector name, best-effort; null when unknown
  cardStatus: CardStatus
  firstSeenAt: string // ISO
  lastLoginAt: string // ISO
}

// On-chain values are loaded lazily, per wallet, via /api/admin/users/value so
// the list itself returns instantly. Each field is null when its RPC read fails.
export interface AdminUserValue {
  walletUsd: number | null // whitelisted token balances valued in USD
  vaultUsd: number | null // assets deposited in the vault (USDC ≈ USD)
}
