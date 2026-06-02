import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { readPublicEnv, readServerEnv } from './env'

describe('readPublicEnv', () => {
  let snapshot: NodeJS.ProcessEnv

  beforeEach(() => { snapshot = { ...process.env } })
  afterEach(() => { process.env = snapshot })

  it('returns wcProjectId and rpcUrl when set', () => {
    process.env.NEXT_PUBLIC_WC_PROJECT_ID = 'pid'
    process.env.NEXT_PUBLIC_RPC_URL = 'https://eth.example/v2/abc'
    expect(readPublicEnv()).toEqual({ wcProjectId: 'pid', rpcUrl: 'https://eth.example/v2/abc' })
  })

  it('throws when wcProjectId missing', () => {
    delete process.env.NEXT_PUBLIC_WC_PROJECT_ID
    process.env.NEXT_PUBLIC_RPC_URL = 'https://eth.example/v2/abc'
    expect(() => readPublicEnv()).toThrow()
  })

  it('throws when rpcUrl is not a URL', () => {
    process.env.NEXT_PUBLIC_WC_PROJECT_ID = 'pid'
    process.env.NEXT_PUBLIC_RPC_URL = 'not-a-url'
    expect(() => readPublicEnv()).toThrow()
  })
})

describe('readServerEnv', () => {
  let snapshot: NodeJS.ProcessEnv

  beforeEach(() => { snapshot = { ...process.env } })
  afterEach(() => { process.env = snapshot })

  it('parses all server values with defaults', () => {
    process.env.SESSION_SECRET = '0'.repeat(64)
    process.env.NONCE_SECRET = '1'.repeat(64)
    delete process.env.SESSION_TTL_SECONDS
    const env = readServerEnv()
    expect(env.sessionSecret).toBe('0'.repeat(64))
    expect(env.nonceSecret).toBe('1'.repeat(64))
    expect(env.sessionTtl).toBe(604800)
  })

  it('throws when sessionSecret is too short', () => {
    process.env.SESSION_SECRET = 'short'
    process.env.NONCE_SECRET = '1'.repeat(64)
    expect(() => readServerEnv()).toThrow()
  })

  it('throws when nonceSecret missing', () => {
    process.env.SESSION_SECRET = '0'.repeat(64)
    delete process.env.NONCE_SECRET
    expect(() => readServerEnv()).toThrow()
  })

  it('coerces SESSION_TTL_SECONDS string to number', () => {
    process.env.SESSION_SECRET = '0'.repeat(64)
    process.env.NONCE_SECRET = '1'.repeat(64)
    process.env.SESSION_TTL_SECONDS = '3600'
    expect(readServerEnv().sessionTtl).toBe(3600)
  })
})
