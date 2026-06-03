import { getAddress } from 'viem'
import { mainnet, base, arbitrum, polygon } from 'viem/chains'
import type { Chain } from 'viem'
import type { Address } from '@/lib/web3/types'

// Canonical, whitelisted collateral assets. On-chain a single asset may appear
// on several networks (and as native or wrapped) — we aggregate them by symbol.
export type CanonicalSymbol = 'ETH' | 'BTC' | 'USDC'
export type PriceKey = 'ETH' | 'BTC' | 'USD'

export interface CanonicalMeta {
  name: string
  decimals: number
  priceKey: PriceKey
}

export const CANONICAL_META: Record<CanonicalSymbol, CanonicalMeta> = {
  ETH: { name: 'Ethereum', decimals: 18, priceKey: 'ETH' },
  BTC: { name: 'Bitcoin', decimals: 8, priceKey: 'BTC' },
  USDC: { name: 'USDC', decimals: 6, priceKey: 'USD' },
}

export interface TokenSource {
  canonical: CanonicalSymbol
  kind: 'native' | 'erc20'
  address?: Address // erc20 only
  decimals: number
}

export interface ChainConfig {
  id: number
  name: string
  chain: Chain
  rpcUrl: string
  tokens: TokenSource[]
}

// Chainlink USD price feeds on Ethereum mainnet (8 decimals). A token's USD
// price is the same regardless of which chain the balance sits on, so we read
// prices once from mainnet. USDC is pegged to $1.
export const CHAINLINK_FEEDS: Record<'ETH' | 'BTC', Address> = {
  ETH: getAddress('0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419'),
  BTC: getAddress('0xF4030086522a5bEEa4988F8cA5B36dbC97BeE88c'),
}

const erc20 = (canonical: CanonicalSymbol, address: string, decimals: number): TokenSource => ({
  canonical,
  kind: 'erc20',
  address: getAddress(address),
  decimals,
})

const nativeEth: TokenSource = { canonical: 'ETH', kind: 'native', decimals: 18 }

function rpc(envVar: string, fallback: string): string {
  const value = process.env[envVar]
  return value && value.length > 0 ? value : fallback
}

export function getChainConfigs(): ChainConfig[] {
  return [
    {
      id: mainnet.id,
      name: 'Ethereum',
      chain: mainnet,
      rpcUrl: rpc('NEXT_PUBLIC_RPC_URL', 'https://eth.llamarpc.com'),
      tokens: [
        nativeEth,
        erc20('BTC', '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599', 8),
        erc20('USDC', '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', 6),
      ],
    },
    {
      id: base.id,
      name: 'Base',
      chain: base,
      rpcUrl: rpc('NEXT_PUBLIC_RPC_URL_BASE', 'https://mainnet.base.org'),
      tokens: [nativeEth, erc20('USDC', '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', 6)],
    },
    {
      id: arbitrum.id,
      name: 'Arbitrum',
      chain: arbitrum,
      rpcUrl: rpc('NEXT_PUBLIC_RPC_URL_ARBITRUM', 'https://arb1.arbitrum.io/rpc'),
      tokens: [
        nativeEth,
        erc20('BTC', '0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f', 8),
        erc20('USDC', '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', 6),
      ],
    },
    {
      id: polygon.id,
      name: 'Polygon',
      chain: polygon,
      rpcUrl: rpc('NEXT_PUBLIC_RPC_URL_POLYGON', 'https://polygon-rpc.com'),
      // Native POL is not whitelisted collateral; WETH is the canonical ETH here.
      tokens: [
        erc20('ETH', '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619', 18),
        erc20('BTC', '0x1BFD67037B42Cf73acF2047067bd4F2C47D9BfD6', 8),
        erc20('USDC', '0x3c499c542cEF5E3811e1192ce70d8cc03d5c3359', 6),
      ],
    },
  ]
}
