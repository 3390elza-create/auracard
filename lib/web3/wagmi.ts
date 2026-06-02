import { http } from 'wagmi'
import { mainnet } from '@reown/appkit/networks'
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi'
import { readPublicEnv } from './env'

const { wcProjectId, rpcUrl } = readPublicEnv()

export const wagmiAdapter = new WagmiAdapter({
  networks: [mainnet],
  projectId: wcProjectId,
  ssr: true,
  transports: { [mainnet.id]: http(rpcUrl) },
})

export const wagmiConfig = wagmiAdapter.wagmiConfig
