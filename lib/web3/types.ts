import type { Address } from '@/lib/mock/types'

export type { Address }

export interface SessionClaims {
  address: Address
  chainId: number
  iat: number
  exp: number
}

export interface SiweMessageArgs {
  domain: string
  address: Address
  uri: string
  chainId: number
  nonce: string
  issuedAt: string
  statement?: string
}

export type SiweLoginError =
  | 'user_rejected_connect'
  | 'user_rejected_signature'
  | 'wrong_chain'
  | 'nonce_failed'
  | 'verify_failed'
  | 'network_error'

export type SiweLoginState =
  | { status: 'idle' }
  | { status: 'connecting' }
  | { status: 'requesting_nonce' }
  | { status: 'awaiting_signature' }
  | { status: 'verifying' }
  | { status: 'success'; address: Address }
  | { status: 'error'; error: SiweLoginError }

export type SessionState =
  | { status: 'loading' }
  | { status: 'unauthenticated' }
  | { status: 'authenticated'; address: Address; chainId: number }

export interface WalletSession {
  address: Address
  addressShort: string
  chainId: number
  chainName: string
}
