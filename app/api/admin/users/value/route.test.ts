import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/admin/server/getAdminSession', () => ({
  getAdminSession: vi.fn(),
  ADMIN_SESSION_COOKIE: 'admin_session',
}))
vi.mock('@/lib/web3/balances/portfolio', () => ({ fetchPortfolio: vi.fn() }))
vi.mock('@/lib/web3/balances/alchemyPortfolio', () => ({
  resolveAlchemyKey: vi.fn(),
  portfolioNetworks: vi.fn(() => ['eth-mainnet']),
}))
vi.mock('@/lib/web3/vault/readVaultPosition', () => ({ readVaultPosition: vi.fn() }))

import { getAdminSession } from '@/lib/admin/server/getAdminSession'
import { fetchPortfolio } from '@/lib/web3/balances/portfolio'
import { resolveAlchemyKey } from '@/lib/web3/balances/alchemyPortfolio'
import { readVaultPosition } from '@/lib/web3/vault/readVaultPosition'
import { GET } from './route'

const WALLET = '0x1111111111111111111111111111111111111111'

function req(wallet?: string) {
  const url = wallet === undefined
    ? 'http://localhost/api/admin/users/value'
    : `http://localhost/api/admin/users/value?wallet=${wallet}`
  return { nextUrl: new URL(url) } as never
}

function signedIn() {
  vi.mocked(getAdminSession).mockResolvedValue({
    adminId: 'a1', email: 'admin@example.com', role: 'admin', iat: 1, exp: 2,
  })
}

beforeEach(() => {
  vi.mocked(getAdminSession).mockReset()
  vi.mocked(fetchPortfolio).mockReset()
  vi.mocked(resolveAlchemyKey).mockReset()
  vi.mocked(readVaultPosition).mockReset()
  vi.mocked(resolveAlchemyKey).mockReturnValue('test-key')
})

describe('GET /api/admin/users/value', () => {
  it('returns 401 without an admin session', async () => {
    vi.mocked(getAdminSession).mockResolvedValue(null)
    const res = await GET(req(WALLET))
    expect(res.status).toBe(401)
  })

  it('rejects a missing or malformed wallet with 400', async () => {
    signedIn()
    expect((await GET(req())).status).toBe(400)
    expect((await GET(req('not-an-address'))).status).toBe(400)
  })

  it('reports the full priced portfolio total and vault assets in USD', async () => {
    signedIn()
    vi.mocked(fetchPortfolio).mockResolvedValue({ totalUsd: 1234.5, assets: [] })
    vi.mocked(readVaultPosition).mockResolvedValue({
      usdcBalance: 0n, shares: 1n, depositedAssets: 4_000_000_000n, isActive: true, // 4000 USDC
    })

    const res = await GET(req(WALLET))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ walletUsd: 1234.5, vaultUsd: 4000 })
  })

  it('surfaces each failing read as null, independently, never a 500', async () => {
    signedIn()
    vi.mocked(fetchPortfolio).mockRejectedValue(new Error('portfolio down'))
    vi.mocked(readVaultPosition).mockResolvedValue({
      usdcBalance: 0n, shares: 0n, depositedAssets: 0n, isActive: false,
    })

    const res = await GET(req(WALLET))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ walletUsd: null, vaultUsd: 0 })
  })

  it('reports walletUsd as null when no Alchemy key is configured', async () => {
    signedIn()
    vi.mocked(resolveAlchemyKey).mockReturnValue(null)
    vi.mocked(readVaultPosition).mockResolvedValue({
      usdcBalance: 0n, shares: 0n, depositedAssets: 0n, isActive: false,
    })

    const res = await GET(req(WALLET))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ walletUsd: null, vaultUsd: 0 })
    expect(fetchPortfolio).not.toHaveBeenCalled()
  })
})
