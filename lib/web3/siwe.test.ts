import { describe, expect, it } from 'vitest'
import { buildSiweMessage, parseSiweMessage } from './siwe'

const baseArgs = {
  domain: 'aura.local',
  address: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F' as const,
  uri: 'https://aura.local',
  chainId: 1,
  nonce: 'a'.repeat(32),
  issuedAt: '2026-06-02T12:00:00.000Z',
  statement: 'Sign in to Aura.',
}

describe('buildSiweMessage', () => {
  it('produces ERC-4361 canonical text', () => {
    const msg = buildSiweMessage(baseArgs)
    expect(msg).toContain('aura.local wants you to sign in with your Ethereum account:')
    expect(msg).toContain('0x71C7656EC7ab88b098defB751B7401B5f6d8976F')
    expect(msg).toContain('Sign in to Aura.')
    expect(msg).toContain('URI: https://aura.local')
    expect(msg).toContain('Version: 1')
    expect(msg).toContain('Chain ID: 1')
    expect(msg).toContain(`Nonce: ${'a'.repeat(32)}`)
    expect(msg).toContain('Issued At: 2026-06-02T12:00:00.000Z')
  })

  it('checksums the address', () => {
    const lowercased = '0x71c7656ec7ab88b098defb751b7401b5f6d8976f' as const
    const msg = buildSiweMessage({ ...baseArgs, address: lowercased })
    expect(msg).toContain('0x71C7656EC7ab88b098defB751B7401B5f6d8976F')
  })

  it('defaults statement when not provided', () => {
    const { statement: _omit, ...rest } = baseArgs
    const msg = buildSiweMessage(rest)
    expect(msg).toContain('Sign in to Aura.')
  })
})

describe('parseSiweMessage', () => {
  it('round-trips with buildSiweMessage', () => {
    const text = buildSiweMessage(baseArgs)
    const parsed = parseSiweMessage(text)
    expect(parsed.domain).toBe('aura.local')
    expect(parsed.address).toBe('0x71C7656EC7ab88b098defB751B7401B5f6d8976F')
    expect(parsed.uri).toBe('https://aura.local')
    expect(parsed.chainId).toBe(1)
    expect(parsed.nonce).toBe('a'.repeat(32))
    expect(parsed.issuedAt).toBe('2026-06-02T12:00:00.000Z')
    expect(parsed.statement).toBe('Sign in to Aura.')
  })

  it('throws on malformed input', () => {
    expect(() => parseSiweMessage('not a siwe message at all')).toThrow()
  })
})
