import Image from 'next/image'
import Link from 'next/link'

const links = [
  { label: 'Terms', href: '/terms' },
  { label: 'Privacy', href: '/privacy' },
  { label: 'Support', href: '/support' },
  { label: 'FAQ', href: '/faq' },
]

export function Footer() {
  return (
    <footer className="mt-20 w-full border-t border-glass-border bg-[#0e0e13] py-stack-lg">
      <div className="mx-auto flex max-w-container-max flex-col items-center justify-between gap-stack-md px-margin-desktop md:flex-row">
        <Link href="/" className="flex items-center gap-3">
          <Image src="/logo.svg" alt="Aura" width={32} height={32} className="opacity-70" />
          <span className="text-headline-md text-text-primary">Aura</span>
        </Link>
        <nav className="flex flex-wrap justify-center gap-8">
          {links.map(({ label, href }) => (
            <Link
              key={label}
              href={href}
              className="text-label-sm uppercase tracking-wider text-text-secondary transition-colors hover:text-aurora-blue"
            >
              {label}
            </Link>
          ))}
        </nav>
        <p className="text-label-sm text-text-secondary">© 2026 Aura. All rights reserved.</p>
      </div>
    </footer>
  )
}
