import Image from 'next/image'

const links = ['Terms', 'Privacy', 'Support', 'Blog']

export function Footer() {
  return (
    <footer className="mt-20 w-full border-t border-glass-border bg-[#0e0e13] py-stack-lg">
      <div className="mx-auto flex max-w-container-max flex-col items-center justify-between gap-stack-md px-margin-desktop md:flex-row">
        <div className="flex items-center gap-3">
          <Image src="/logo.svg" alt="Aura" width={32} height={32} className="opacity-70" />
          <span className="text-headline-md text-text-primary">Aura</span>
        </div>
        <div className="flex flex-wrap justify-center gap-8">
          {links.map(label => (
            <a
              key={label}
              href="#"
              className="text-label-sm uppercase tracking-wider text-text-secondary transition-colors hover:text-aurora-blue"
            >
              {label}
            </a>
          ))}
        </div>
        <p className="text-label-sm text-text-secondary">© 2026 Aura. All rights reserved.</p>
      </div>
    </footer>
  )
}
