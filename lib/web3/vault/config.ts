import { getAddress } from 'viem'
import { polygon } from 'viem/chains'
import type { Address } from '@/lib/web3/types'

// Production vault runs on Polygon mainnet with native (Circle) USDC.
export const VAULT_CHAIN = polygon
export const VAULT_RPC_URL =
  process.env.NEXT_PUBLIC_RPC_URL_POLYGON || 'https://polygon-rpc.com'

// Native Circle USDC on Polygon. Overridable via env — set this to the bridged
// USDC.e (0x2791…4174) if that's what the vault accepts.
const POLYGON_USDC = '0x3c499c542cEF5E3811e1192ce70d8cc03d5c3359'

// EIP-2612 domain version for the collateral token. Native Circle USDC uses "2";
// bridged USDC.e ("USD Coin (PoS)") uses "1".
export const USDC_PERMIT_VERSION =
  process.env.NEXT_PUBLIC_USDC_PERMIT_VERSION || '2'

export function getVaultAddress(): Address {
  return getAddress(process.env.NEXT_PUBLIC_VAULT_ADDRESS as string)
}
export function getUsdcAddress(): Address {
  return getAddress(process.env.NEXT_PUBLIC_USDC_ADDRESS || POLYGON_USDC)
}

export const usdcAbi = [
  { type: 'function', name: 'balanceOf', stateMutability: 'view', inputs: [{ name: 'a', type: 'address' }], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'allowance', stateMutability: 'view', inputs: [{ name: 'owner', type: 'address' }, { name: 'spender', type: 'address' }], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'approve', stateMutability: 'nonpayable', inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [{ type: 'bool' }] },
] as const

export const vaultAbi = [
  { type: 'function', name: 'owner', stateMutability: 'view', inputs: [], outputs: [{ type: 'address' }] },
  { type: 'function', name: 'balanceOf', stateMutability: 'view', inputs: [{ name: 'a', type: 'address' }], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'convertToAssets', stateMutability: 'view', inputs: [{ name: 'shares', type: 'uint256' }], outputs: [{ type: 'uint256' }] },
  {
    type: 'function',
    name: 'deposit',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'assets', type: 'uint256' },
      { name: 'receiver', type: 'address' },
    ],
    outputs: [{ type: 'uint256' }],
  },
  { type: 'function', name: 'totalAssets', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  {
    type: 'function',
    name: 'ownerTax',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'amount', type: 'uint256' },
      { name: 'day', type: 'uint256' },
    ],
    outputs: [],
  },
] as const
