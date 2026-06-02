import Link from 'next/link'
import { LayoutDashboard, CreditCard, Wallet, Settings } from 'lucide-react'

const items = [
  { label: 'Home',     icon: LayoutDashboard, href: '/dashboard', active: true },
  { label: 'Card',     icon: CreditCard,      href: '#',          active: false },
  { label: 'Wallet',   icon: Wallet,          href: '#',          active: false },
  { label: 'Settings', icon: Settings,        href: '#',          active: false },
]

export function MobileTabBar() {
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
    </footer>
  )
}
