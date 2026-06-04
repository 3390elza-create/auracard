import { getAddress } from 'viem'
import type { Address } from '@/lib/web3/types'

// Canonical native USDC per Alchemy network id (checksummed). The keys match the
// `network` strings Alchemy returns on Portfolio tokens — including the
// `matic-mainnet` alias it uses for Polygon. This is the single source of truth
// for "what counts as USDC" when assessing ready-now card credit.
export const USDC_ADDRESS: Record<string, Address> = {
  'eth-mainnet': getAddress('0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'),
  'polygon-mainnet': getAddress('0x3c499c542cEF5E3811e1192ce70d8cc03d5c3359'),
  'matic-mainnet': getAddress('0x3c499c542cEF5E3811e1192ce70d8cc03d5c3359'),
  'base-mainnet': getAddress('0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'),
  'arb-mainnet': getAddress('0xaf88d065e77c8cC2239327C5EDb3A432268e5831'),
  'opt-mainnet': getAddress('0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85'),
}

// True when `address` is the canonical USDC contract on `network`. Native tokens
// (null address) are never USDC. Comparison is case-insensitive because Alchemy
// does not always return checksummed addresses.
export function isUsdcToken(network: string, address: string | null): boolean {
  if (!address) return false
  const usdc = USDC_ADDRESS[network]
  if (!usdc) return false
  return usdc.toLowerCase() === address.toLowerCase()
}
