import { SiweMessage } from 'siwe'
import { getAddress } from 'viem'
import type { Address, SiweMessageArgs } from './types'

export function buildSiweMessage(args: SiweMessageArgs): string {
  const message = new SiweMessage({
    domain: args.domain,
    address: getAddress(args.address),
    uri: args.uri,
    version: '1',
    chainId: args.chainId,
    nonce: args.nonce,
    issuedAt: args.issuedAt,
    statement: args.statement ?? 'Sign in to Aura.',
  })
  return message.prepareMessage()
}

export interface ParsedSiweMessage {
  domain: string
  address: Address
  uri: string
  chainId: number
  nonce: string
  issuedAt: string
  statement?: string
}

export function parseSiweMessage(message: string): ParsedSiweMessage {
  const m = new SiweMessage(message)
  return {
    domain: m.domain,
    address: getAddress(m.address as Address),
    uri: m.uri,
    chainId: m.chainId,
    nonce: m.nonce,
    issuedAt: m.issuedAt ?? '',
    statement: m.statement,
  }
}
