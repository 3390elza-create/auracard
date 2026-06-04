import type { Metadata } from 'next'
import localFont from 'next/font/local'
import { AuroraBackground } from '@/components/layout/AuroraBackground'
import { Web3Providers } from '@/lib/web3/providers'
import './globals.css'

// Self-hosted (Geist) to avoid a Google Fonts fetch at build time — that fetch
// hangs/retries on build hosts without outbound access to fonts.googleapis.com.
// Keeps the --font-inter variable so existing CSS/Tailwind tokens are unchanged.
const inter = localFont({
  src: './fonts/geist.woff2',
  display: 'swap',
  variable: '--font-inter',
})

export const metadata: Metadata = {
  title: 'Aura — Your on-chain wealth, now in the real world',
  description: 'The first luxury credit card backed by your crypto.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} dark`}>
      <body className="bg-background text-text-primary antialiased min-h-screen relative">
        <AuroraBackground />
        <Web3Providers>{children}</Web3Providers>
      </body>
    </html>
  )
}
