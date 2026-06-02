import type { NextConfig } from 'next'

const config: NextConfig = {
  reactStrictMode: true,
  webpack(webpackConfig) {
    // @wagmi/connectors dynamically imports @base-org/account; stub it so
    // webpack doesn't error on the missing optional package.
    webpackConfig.resolve = {
      ...webpackConfig.resolve,
      alias: {
        ...(webpackConfig.resolve?.alias as Record<string, unknown>),
        '@base-org/account': false,
      },
    }
    return webpackConfig
  },
}

export default config
