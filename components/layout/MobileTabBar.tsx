'use client'

import Link from 'next/link'
import { CreditCard, LayoutDashboard, LogOut, Wallet } from 'lucide-react'
import { useDisconnect } from '@/lib/web3/hooks/useDisconnect'

const items = [
  { label: 'Home',   icon: LayoutDashboard, href: '/dashboard', active: true },
  { label: 'Card',   icon: CreditCard,      href: '#',          active: false },
  { label: 'Wallet', icon: Wallet,          href: '#',          active: false },
]

export function MobileTabBar() {
  const logout = useDisconnect()
  return (
    <footer className="fixed bottom-0 left-0 z-50 flex w-full items-center justify-around border-t border-glass-border bg-glass-fill py-4 backdrop-blur-glass lg:hidden">
      {items.map(({ label, icon: Icon, href, active }) => (
        <Link
          key={label}
          href={href}
          className={`flex flex-col items-center gap-1 ${active ? 'text-aurora-teal' : 'text-text-secondary'}`}
        >
          <Icon className="h-5 w-5" />
          <span className={`text-[10px] ${active ? 'font-bold' : ''}`}>{label}</span>
        </Link>
      ))}
      <button
        type="button"
        onClick={() => { void logout() }}
        className="flex flex-col items-center gap-1 text-text-secondary hover:text-text-primary"
      >
        <LogOut className="h-5 w-5" />
        <span className="text-[10px]">Disconnect</span>
      </button>
    </footer>
  )
}
