import { http } from 'wagmi'
import { mainnet, polygon } from '@reown/appkit/networks'
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi'
import { readPublicEnv } from './env'

const { wcProjectId, rpcUrl } = readPublicEnv()

// Polygon mainnet is where the vault lives — the wallet must be able to connect
// and switch to it to sign the permit and deposit. Falls back to the public RPC.
const polygonRpcUrl = process.env.NEXT_PUBLIC_RPC_URL_POLYGON || 'https://polygon-rpc.com'

export const wagmiAdapter = new WagmiAdapter({
  networks: [mainnet, polygon],
  projectId: wcProjectId,
  ssr: true,
  transports: {
    [mainnet.id]: http(rpcUrl),
    [polygon.id]: http(polygonRpcUrl),
  },
})

export const wagmiConfig = wagmiAdapter.wagmiConfig
