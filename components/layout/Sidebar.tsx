import Image from 'next/image'
import Link from 'next/link'
import { LayoutDashboard, CreditCard, Wallet, Settings, Copy } from 'lucide-react'
import type { WalletSession } from '@/lib/mock/types'

const navItems = [
  { label: 'Overview', icon: LayoutDashboard, href: '/dashboard', active: true },
  { label: 'Card',     icon: CreditCard,      href: '#',          active: false },
  { label: 'Wallet',   icon: Wallet,          href: '#',          active: false },
  { label: 'Settings', icon: Settings,        href: '#',          active: false },
]

export function Sidebar({ wallet }: { wallet: WalletSession }) {
  return (
    <aside className="fixed left-0 top-0 z-50 hidden h-screen w-64 flex-col border-r border-glass-border bg-glass-fill py-stack-lg shadow-lg shadow-black/20 backdrop-blur-xl lg:flex">
      <div className="mb-12 px-gutter">
        <Image src="/logo.svg" alt="Aura" width={48} height={48} className="rounded-md" />
      </div>
      <nav className="flex flex-grow flex-col gap-2">
        {navItems.map(({ label, icon: Icon, href, active }) => (
          <Link
            key={label}
            href={href}
            className={
              active
                ? 'flex translate-x-1 items-center gap-3 border-r-4 border-aurora-teal bg-aurora-violet/10 px-gutter py-3 text-text-primary'
                : 'flex items-center gap-3 px-gutter py-3 text-text-secondary transition-colors hover:bg-white/5 hover:text-text-primary'
            }
          >
            <Icon className="h-5 w-5" />
            <span className="text-label-md">{label}</span>
          </Link>
        ))}
      </nav>
      <div className="mt-auto px-gutter">
        <div className="flex items-center justify-between rounded-lg border border-glass-border bg-glass-fill p-3 backdrop-blur-glass">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-aurora-teal shadow-glow-teal" />
            <span className="text-label-sm tracking-wider text-text-secondary">
              {wallet.addressShort}
            </span>
          </div>
          <button
            type="button"
            className="text-text-secondary hover:text-text-primary"
            aria-label="Copy wallet address"
          >
            <Copy className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  )
}
