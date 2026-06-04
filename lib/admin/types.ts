import type { CardStatus } from '@prisma/client'

export interface AdminUserRow {
  walletAddress: string
  chainId: number
  cardStatus: CardStatus
  firstSeenAt: string // ISO
  lastLoginAt: string // ISO
  totalUsd: number | null // null when the on-chain read failed
}
