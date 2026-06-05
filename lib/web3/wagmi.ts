import { http } from 'wagmi'
import { mainnet, polygon, base, arbitrum, optimism } from '@reown/appkit/networks'
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi'
import { readPublicEnv } from './env'

const { wcProjectId, rpcUrl } = readPublicEnv()

// Polygon mainnet is where the vault lives — the wallet must connect and switch to
// it to sign the permit and deposit. Base/Arbitrum/Optimism are cross-chain zap
// source chains: the wallet must reach them to swap+bridge. Each falls back to a
// public RPC when its env URL is unset.
const polygonRpcUrl = process.env.NEXT_PUBLIC_RPC_URL_POLYGON || 'https://polygon-rpc.com'
const baseRpcUrl = process.env.NEXT_PUBLIC_RPC_URL_BASE || 'https://mainnet.base.org'
const arbitrumRpcUrl = process.env.NEXT_PUBLIC_RPC_URL_ARBITRUM || 'https://arb1.arbitrum.io/rpc'
const optimismRpcUrl = process.env.NEXT_PUBLIC_RPC_URL_OPTIMISM || 'https://mainnet.optimism.io'

export const wagmiAdapter = new WagmiAdapter({
  networks: [mainnet, polygon, base, arbitrum, optimism],
  projectId: wcProjectId,
  ssr: true,
  transports: {
    [mainnet.id]: http(rpcUrl),
    [polygon.id]: http(polygonRpcUrl),
    [base.id]: http(baseRpcUrl),
    [arbitrum.id]: http(arbitrumRpcUrl),
    [optimism.id]: http(optimismRpcUrl),
  },
})

export const wagmiConfig = wagmiAdapter.wagmiConfig
