import localFont from 'next/font/local'

const geist = localFont({
  src: '../fonts/geist.woff2',
  display: 'swap',
  variable: '--font-geist',
})

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div
      className={`${geist.variable} theme-aura-light min-h-screen font-sans antialiased`}
      style={{ fontFamily: 'var(--font-geist), system-ui, sans-serif' }}
    >
      {children}
    </div>
  )
}
