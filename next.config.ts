import type { NextConfig } from 'next'

const config: NextConfig = {
  reactStrictMode: true,
  // Minimal, self-contained server output for Docker (.next/standalone).
  output: 'standalone',
  images: {
    // Serve modern formats; next/image negotiates per Accept header (sharp installed).
    formats: ['image/avif', 'image/webp'],
    // Marketing art renders at ~500px (1000px @2x); no need to emit huge variants.
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    deviceSizes: [360, 520, 768, 1024, 1280],
  },
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
