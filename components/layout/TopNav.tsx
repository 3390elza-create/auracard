import Image from 'next/image'
import Link from 'next/link'
import { Wallet } from 'lucide-react'
import { GradientButton } from '@/components/ui/GradientButton'

const links = [
  { label: 'Home',        href: '/',        active: true },
  { label: 'Cards',       href: '#',        active: false },
  { label: 'Investments', href: '#',        active: false },
  { label: 'Security',    href: '#',        active: false },
]

export function TopNav() {
  return (
    <nav className="sticky top-0 z-50 w-full bg-glass-fill backdrop-blur-md border-b border-glass-border">
      <div className="mx-auto flex max-w-container-max items-center justify-between px-gutter py-4">
        <Link href="/" className="flex items-center gap-3">
          <Image src="/logo.svg" alt="Aura" width={40} height={40} />
          <span className="text-headline-md font-bold tracking-tight text-text-primary">Aura</span>
        </Link>
        <div className="hidden items-center gap-8 md:flex">
          {links.map(link => (
            <Link
              key={link.label}
              href={link.href}
              className={
                link.active
                  ? 'text-label-md font-bold text-text-primary border-b-2 border-aurora-violet pb-1'
                  : 'text-label-md text-text-secondary transition-colors hover:text-text-primary'
              }
            >
              {link.label}
            </Link>
          ))}
        </div>
        <GradientButton href="/connect" icon={<Wallet className="h-5 w-5" />} iconPosition="left">
          Connect Wallet
        </GradientButton>
      </div>
    </nav>
  )
}
