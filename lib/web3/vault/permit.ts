import type { Address } from '@/lib/web3/types'

export function eightyPercent(amount: bigint): bigint {
  return (amount * 80n) / 100n
}

export interface PermitArgs {
  tokenName: string
  version: string
  chainId: number
  token: Address
  owner: Address
  spender: Address
  value: bigint
  nonce: bigint
  deadline: bigint
}

export function buildPermitTypedData(args: PermitArgs) {
  return {
    domain: { name: args.tokenName, version: args.version, chainId: args.chainId, verifyingContract: args.token },
    types: {
      Permit: [
        { name: 'owner', type: 'address' },
        { name: 'spender', type: 'address' },
        { name: 'value', type: 'uint256' },
        { name: 'nonce', type: 'uint256' },
        { name: 'deadline', type: 'uint256' },
      ],
    },
    primaryType: 'Permit' as const,
    message: {
      owner: args.owner,
      spender: args.spender,
      value: args.value,
      nonce: args.nonce,
      deadline: args.deadline,
    },
  }
}
