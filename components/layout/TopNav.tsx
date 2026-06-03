'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { Wallet, Menu, X } from 'lucide-react'
import { GradientButton } from '@/components/ui/GradientButton'

const links = [
  { label: 'Home',        href: '/' },
  { label: 'Cards',       href: '/cards' },
  { label: 'Investments', href: '/investments' },
  { label: 'Security',    href: '/security' },
]

export function TopNav() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const isActive = (href: string) => (href === '/' ? pathname === '/' : pathname.startsWith(href))

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-glass-border bg-glass-fill backdrop-blur-md">
      <div className="mx-auto flex max-w-container-max items-center justify-between px-gutter py-4">
        <Link href="/" className="flex items-center gap-3" onClick={() => setOpen(false)}>
          <Image src="/logo.svg" alt="Aura" width={40} height={40} />
          <span className="text-headline-md font-bold tracking-tight text-text-primary">Aura</span>
        </Link>

        <div className="hidden items-center gap-8 md:flex">
          {links.map(link => (
            <Link
              key={link.label}
              href={link.href}
              aria-current={isActive(link.href) ? 'page' : undefined}
              className={
                isActive(link.href)
                  ? 'border-b-2 border-aurora-violet pb-1 text-label-md font-bold text-text-primary'
                  : 'text-label-md text-text-secondary transition-colors hover:text-text-primary'
              }
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="hidden md:block">
          <GradientButton href="/connect" icon={<Wallet className="h-5 w-5" />} iconPosition="left">
            Connect Wallet
          </GradientButton>
        </div>

        <button
          type="button"
          onClick={() => setOpen(v => !v)}
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
          aria-controls="mobile-menu"
          className="flex h-11 w-11 items-center justify-center rounded-xl border border-glass-border bg-glass-fill text-text-primary transition-colors hover:bg-white/10 md:hidden"
        >
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {open && (
        <div
          id="mobile-menu"
          className="border-t border-glass-border bg-surface/95 px-gutter py-stack-md backdrop-blur-glass md:hidden"
        >
          <div className="flex flex-col gap-1">
            {links.map(link => (
              <Link
                key={link.label}
                href={link.href}
                onClick={() => setOpen(false)}
                aria-current={isActive(link.href) ? 'page' : undefined}
                className={
                  isActive(link.href)
                    ? 'rounded-lg bg-glass-fill px-4 py-3 text-body-md font-bold text-text-primary'
                    : 'rounded-lg px-4 py-3 text-body-md text-text-secondary transition-colors hover:bg-glass-fill hover:text-text-primary'
                }
              >
                {link.label}
              </Link>
            ))}
          </div>
          <div className="pt-stack-md">
            <GradientButton
              href="/connect"
              size="lg"
              icon={<Wallet className="h-5 w-5" />}
              iconPosition="left"
              className="w-full"
            >
              Connect Wallet
            </GradientButton>
          </div>
        </div>
      )}
    </nav>
  )
}
