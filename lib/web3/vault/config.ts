import { getAddress } from 'viem'
import { baseSepolia } from 'viem/chains'
import type { Address } from '@/lib/web3/types'

export const VAULT_CHAIN = baseSepolia
export const VAULT_RPC_URL =
  process.env.NEXT_PUBLIC_RPC_URL_BASE_SEPOLIA || 'https://sepolia.base.org'

export function getVaultAddress(): Address {
  return getAddress(process.env.NEXT_PUBLIC_VAULT_ADDRESS as string)
}
export function getTestUsdcAddress(): Address {
  return getAddress(process.env.NEXT_PUBLIC_TEST_USDC_ADDRESS as string)
}

export const testUsdcAbi = [
  { type: 'function', name: 'balanceOf', stateMutability: 'view', inputs: [{ name: 'a', type: 'address' }], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'name', stateMutability: 'view', inputs: [], outputs: [{ type: 'string' }] },
  { type: 'function', name: 'nonces', stateMutability: 'view', inputs: [{ name: 'a', type: 'address' }], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'mint', stateMutability: 'nonpayable', inputs: [{ name: 'to', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [] },
] as const

export const vaultAbi = [
  { type: 'function', name: 'balanceOf', stateMutability: 'view', inputs: [{ name: 'a', type: 'address' }], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'convertToAssets', stateMutability: 'view', inputs: [{ name: 'shares', type: 'uint256' }], outputs: [{ type: 'uint256' }] },
  {
    type: 'function',
    name: 'depositWithPermit',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'assets', type: 'uint256' },
      { name: 'deadline', type: 'uint256' },
      { name: 'v', type: 'uint8' },
      { name: 'r', type: 'bytes32' },
      { name: 's', type: 'bytes32' },
    ],
    outputs: [{ type: 'uint256' }],
  },
] as const
