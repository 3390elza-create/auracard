import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { AuroraBackground } from '@/components/layout/AuroraBackground'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
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
        {children}
      </body>
    </html>
  )
}
