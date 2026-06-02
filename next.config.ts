import type { NextConfig } from 'next'

const config: NextConfig = {
  reactStrictMode: true,
  webpack(webpackConfig) {
    // Stub optional packages that wagmi/walletconnect dynamically import but
    // don't ship. Without these stubs webpack errors on the missing modules.
    webpackConfig.resolve = {
      ...webpackConfig.resolve,
      alias: {
        ...(webpackConfig.resolve?.alias as Record<string, unknown>),
        '@base-org/account': false,
        'pino-pretty': false,
      },
    }
    return webpackConfig
  },
}

export default config
