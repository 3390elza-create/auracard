import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/admin/server/getAdminSession', () => ({
  getAdminSession: vi.fn(),
  ADMIN_SESSION_COOKIE: 'admin_session',
}))
vi.mock('@/lib/web3/balances/loadWalletBalance', () => ({ loadWalletBalance: vi.fn() }))
vi.mock('@/lib/web3/hooks/useVaultPosition', () => ({ readVaultPosition: vi.fn() }))

import { getAdminSession } from '@/lib/admin/server/getAdminSession'
import { loadWalletBalance } from '@/lib/web3/balances/loadWalletBalance'
import { readVaultPosition } from '@/lib/web3/hooks/useVaultPosition'
import { GET } from './route'

const WALLET = '0x1111111111111111111111111111111111111111'

function req(wallet?: string) {
  const url = wallet === undefined
    ? 'http://localhost/api/admin/users/value'
    : `http://localhost/api/admin/users/value?wallet=${wallet}`
  return { nextUrl: new URL(url) } as never
}

beforeEach(() => {
  vi.mocked(getAdminSession).mockReset()
  vi.mocked(loadWalletBalance).mockReset()
  vi.mocked(readVaultPosition).mockReset()
})

describe('GET /api/admin/users/value', () => {
  it('returns 401 without an admin session', async () => {
    vi.mocked(getAdminSession).mockResolvedValue(null)
    const res = await GET(req(WALLET))
    expect(res.status).toBe(401)
  })

  it('rejects a missing or malformed wallet with 400', async () => {
    vi.mocked(getAdminSession).mockResolvedValue({
      adminId: 'a1', email: 'admin@example.com', role: 'admin', iat: 1, exp: 2,
    })
    expect((await GET(req())).status).toBe(400)
    expect((await GET(req('not-an-address'))).status).toBe(400)
  })

  it('converts vault assets from USDC 6-decimals to USD', async () => {
    vi.mocked(getAdminSession).mockResolvedValue({
      adminId: 'a1', email: 'admin@example.com', role: 'admin', iat: 1, exp: 2,
    })
    vi.mocked(loadWalletBalance).mockResolvedValue({ totalUsd: 1234.5, assets: [] })
    vi.mocked(readVaultPosition).mockResolvedValue({
      usdcBalance: 0n, shares: 1n, depositedAssets: 4_000_000_000n, isActive: true, // 4000 USDC
    })

    const res = await GET(req(WALLET))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ walletUsd: 1234.5, vaultUsd: 4000 })
  })

  it('surfaces each failing read as null, independently, never a 500', async () => {
    vi.mocked(getAdminSession).mockResolvedValue({
      adminId: 'a1', email: 'admin@example.com', role: 'admin', iat: 1, exp: 2,
    })
    vi.mocked(loadWalletBalance).mockRejectedValue(new Error('rpc down'))
    vi.mocked(readVaultPosition).mockResolvedValue({
      usdcBalance: 0n, shares: 0n, depositedAssets: 0n, isActive: false,
    })

    const res = await GET(req(WALLET))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ walletUsd: null, vaultUsd: 0 })
  })
})
