# AuraCard Landing v2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the AuraCard home page with a landing visually identical to the `twspendcard.fi` reference (light blue theme, Geist font, section structure, animations), rebranded to AuraCard with no impersonation or fabricated trust signals.

**Architecture:** The reference's semantic color tokens are added to Tailwind in `hsl(var(--x))` form. Default CSS-var values reproduce the *current dark theme* (zero regression on existing screens); a `theme-aura-light` wrapper class overrides them with the reference's light blue palette. The new landing lives in an isolated route group `app/(marketing-v2)/` whose layout applies that class + Geist font and omits the dark `AuroraBackground`. Components mirror the reference section-by-section, porting verbatim markup from the in-repo render at `layout/index.html` with brand/asset/wiring substitutions.

**Tech Stack:** Next.js App Router, TypeScript, Tailwind CSS, `next/font/google` (Geist), lucide-react, existing wagmi/Reown connect flow.

**Reference source of truth:** `layout/index.html` (built render already in the repo) and `layout/assets/index-C1S4kfsI.css` (token values). The full markup of every section is in `layout/index.html` — port from there.

---

## Token reference (extracted from `layout/assets/index-C1S4kfsI.css`)

Light theme (`theme-aura-light`):
```
--background: 0 0% 98%;          --foreground: 230 25% 10%;
--card: 0 0% 100%;               --card-foreground: 230 25% 10%;
--popover: 0 0% 100%;            --popover-foreground: 230 25% 10%;
--primary: 241 100% 50%;         --primary-foreground: 0 0% 100%;
--primary-light: 240 100% 60%;   --primary-dark: 241 100% 40%;
--secondary: 240 20% 96%;        --secondary-foreground: 230 25% 10%;
--muted: 240 10% 92%;            --muted-foreground: 230 10% 46%;
--accent: 241 100% 50%;          --accent-foreground: 0 0% 100%;
--destructive: 0 84% 60%;        --destructive-foreground: 0 0% 100%;
--border: 240 10% 90%;           --input: 240 10% 90%;   --ring: 241 100% 50%;
--success: 160 84% 39%;          --radius: .75rem;
--gradient-primary: linear-gradient(135deg, hsl(241 100% 50%) 0%, hsl(240 100% 60%) 50%, hsl(241 100% 40%) 100%);
--gradient-card: linear-gradient(135deg, hsl(241 100% 50%) 0%, hsl(241 100% 40%) 100%);
--gradient-card-metal: linear-gradient(160deg, hsl(240 5% 22%) 0%, hsl(240 5% 18%) 50%, hsl(240 5% 15%) 100%);
--shadow-card: 0 25px 60px -12px hsl(241 100% 50% / .25);
--shadow-button: 0 4px 14px 0 hsl(241 100% 50% / .39);
```

Default (existing dark theme — HSL of current hex so nothing regresses):
```
--background: 240 11% 6%;     /* #0B0B10 */
--foreground: 195 25% 98%;    /* #F7F9FA */
--card: 240 9% 9%;            /* ~#131318 */
--card-foreground: 195 25% 98%;
--muted-foreground: 222 18% 68%;  /* ~#A0A9BE */
--border: 0 0% 100%;              /* used at /0.12 opacity contexts; existing glass-border kept separately */
--primary: 252 100% 68%;          /* #7C5CFF accent */
--primary-foreground: 0 0% 100%;
--secondary: 240 9% 12%;
--ring: 252 100% 68%;
--radius: .5rem;
```
(Only `background` is consumed by existing components via `bg-background`; the rest are new names. The dark defaults exist so the new semantic utilities have a sane fallback if ever used outside the landing.)

---

## File Structure

- `public/marketing/` — copied assets (hero, metal card, wallet + crypto logos)
- `tailwind.config.ts` — migrate `background` to `hsl(var(--background))`; add semantic tokens + keyframes/animation utilities
- `app/globals.css` — default (dark) token vars on `.dark`/`:root`; `.theme-aura-light` overrides; animation keyframes + helper classes (`gradient-orb`)
- `app/(marketing-v2)/layout.tsx` — route-group layout (Geist, light theme, no aurora)
- `app/(marketing-v2)/page.tsx` — moved/rewritten home that renders the landing
- `components/marketing-v2/content.ts` — all copy/data
- `components/marketing-v2/{SiteHeaderV2,HeroV2,WalletMarquee,BackersStrip,FeaturesGrid,RewardsSection,PremiumCardSection,ClosingCtaV2,SiteFooterV2,ScrollToTop}.tsx`
- `components/marketing-v2/__tests__/wiring.test.tsx` — smoke tests for CTA wiring
- Remove: old landing import graph from `/` (old `app/page.tsx`)

Note: presentational components are server components except `ScrollToTop` (client). No Web3 logic added; CTAs are `next/link` to `/connect`.

---

### Task 0: Copy assets into `public/marketing/`

**Files:**
- Create: `public/marketing/hero-wallet.avif`, `public/marketing/metal-card.png`, `public/marketing/wallets/*`, `public/marketing/crypto/*`

- [ ] **Step 1: Copy and rename assets**

Run (Bash tool):
```bash
cd "d:/projetos/cripto card"
mkdir -p public/marketing/wallets public/marketing/crypto
cp layout/assets/hero-wallet-B9F1gFWp.avif public/marketing/hero-wallet.avif
cp layout/assets/metal-card-blue-B8CN2NwU.png public/marketing/metal-card.png
cp layout/trust-assets/wallets/* public/marketing/wallets/
cp layout/trust-assets/crypto/* public/marketing/crypto/
```

- [ ] **Step 2: Verify files exist**

Run: `ls public/marketing public/marketing/wallets public/marketing/crypto`
Expected: hero-wallet.avif, metal-card.png present; wallets/ has metamask/coinbase/phantom/ledger/exodus/atomic/electrum/tronlink/trust logos + apple-pay.svg + google-pay.svg; crypto/ has tron.svg ethereum.svg bsc.svg polygon.svg.

Note: `trust-logo-name.png` and `trust-wallet-logo.png` are copied but will NOT be used in markup (boundary: no Trust Wallet brand). AuraCard uses `/logo.svg` + a text wordmark instead. Backer SVGs are intentionally not copied.

- [ ] **Step 3: Commit**

```bash
git add public/marketing
git commit -m "chore(landing): add marketing-v2 assets (hero, card, wallet/crypto logos)"
```

---

### Task 1: Tailwind tokens + animation keyframes

**Files:**
- Modify: `tailwind.config.ts`

- [ ] **Step 1: Add semantic color tokens and keyframes**

In `tailwind.config.ts`, inside `theme.extend.colors`, change the `background` entry and add the reference's semantic tokens (keep all existing keys):

```ts
colors: {
  background:        'hsl(var(--background))',
  surface:           '#131318',
  'surface-low':     '#1B1B20',
  'surface-mid':     '#1F1F24',
  'text-primary':    '#F7F9FA',
  'text-secondary':  '#A0A9BE',
  'aurora-violet':   '#7C5CFF',
  'aurora-blue':     '#4F8CFF',
  'aurora-teal':     '#2DD4BF',
  'glass-fill':      'rgba(255,255,255,0.07)',
  'glass-border':    'rgba(255,255,255,0.12)',
  'error':           '#FF6B6B',
  // marketing-v2 semantic tokens (driven by CSS vars)
  foreground:           'hsl(var(--foreground))',
  card:                 'hsl(var(--card))',
  'card-foreground':    'hsl(var(--card-foreground))',
  popover:              'hsl(var(--popover))',
  'popover-foreground': 'hsl(var(--popover-foreground))',
  primary:              'hsl(var(--primary))',
  'primary-foreground': 'hsl(var(--primary-foreground))',
  'primary-light':      'hsl(var(--primary-light))',
  'primary-dark':       'hsl(var(--primary-dark))',
  secondary:            'hsl(var(--secondary))',
  'secondary-foreground':'hsl(var(--secondary-foreground))',
  muted:                'hsl(var(--muted))',
  'muted-foreground':   'hsl(var(--muted-foreground))',
  accent:               'hsl(var(--accent))',
  'accent-foreground':  'hsl(var(--accent-foreground))',
  border:               'hsl(var(--border))',
  input:                'hsl(var(--input))',
  ring:                 'hsl(var(--ring))',
  success:              'hsl(var(--success))',
},
```

Add to `theme.extend` (after `boxShadow`):

```ts
keyframes: {
  'fade-in-up': {
    '0%':   { opacity: '0', transform: 'translateY(20px)' },
    '100%': { opacity: '1', transform: 'translateY(0)' },
  },
  marquee: {
    '0%':   { transform: 'translateX(0)' },
    '100%': { transform: 'translateX(-33.333%)' },
  },
},
animation: {
  'fade-in-up': 'fade-in-up 0.6s ease-out both',
  marquee: 'marquee 40s linear infinite',
},
```

- [ ] **Step 2: Verify config still typechecks**

Run: `npm run typecheck`
Expected: PASS (no errors).

- [ ] **Step 3: Commit**

```bash
git add tailwind.config.ts
git commit -m "feat(landing): add marketing-v2 semantic tokens and animations to Tailwind"
```

---

### Task 2: globals.css — token defaults, light overrides, helper classes

**Files:**
- Modify: `app/globals.css`

- [ ] **Step 1: Add default token vars, light overrides, and helpers**

Append to `app/globals.css` (after the existing `@layer base` block, keep existing content):

```css
@layer base {
  :root, .dark {
    --background: 240 11% 6%;
    --foreground: 195 25% 98%;
    --card: 240 9% 9%;
    --card-foreground: 195 25% 98%;
    --popover: 240 9% 9%;
    --popover-foreground: 195 25% 98%;
    --primary: 252 100% 68%;
    --primary-foreground: 0 0% 100%;
    --primary-light: 252 100% 74%;
    --primary-dark: 252 100% 60%;
    --secondary: 240 9% 12%;
    --secondary-foreground: 195 25% 98%;
    --muted: 240 9% 14%;
    --muted-foreground: 222 18% 68%;
    --accent: 252 100% 68%;
    --accent-foreground: 0 0% 100%;
    --border: 0 0% 100%;
    --input: 0 0% 100%;
    --ring: 252 100% 68%;
    --success: 160 84% 39%;
    --radius: 0.5rem;
  }

  .theme-aura-light {
    --background: 0 0% 98%;
    --foreground: 230 25% 10%;
    --card: 0 0% 100%;
    --card-foreground: 230 25% 10%;
    --popover: 0 0% 100%;
    --popover-foreground: 230 25% 10%;
    --primary: 241 100% 50%;
    --primary-foreground: 0 0% 100%;
    --primary-light: 240 100% 60%;
    --primary-dark: 241 100% 40%;
    --secondary: 240 20% 96%;
    --secondary-foreground: 230 25% 10%;
    --muted: 240 10% 92%;
    --muted-foreground: 230 10% 46%;
    --accent: 241 100% 50%;
    --accent-foreground: 0 0% 100%;
    --border: 240 10% 90%;
    --input: 240 10% 90%;
    --ring: 241 100% 50%;
    --success: 160 84% 39%;
    --radius: 0.75rem;
    --shadow-card: 0 25px 60px -12px hsl(241 100% 50% / 0.25);
    --shadow-button: 0 4px 14px 0 hsl(241 100% 50% / 0.39);
    background-color: hsl(var(--background));
    color: hsl(var(--foreground));
  }
}

@layer components {
  /* marketing-v2 helpers */
  .container-v2 {
    @apply mx-auto w-full max-w-[1200px] px-5 sm:px-8;
  }
  .gradient-orb {
    position: absolute;
    border-radius: 9999px;
    filter: blur(80px);
    pointer-events: none;
  }
  .shadow-button-v2 { box-shadow: var(--shadow-button); }
  .shadow-card-v2 { box-shadow: var(--shadow-card); }
}

.animate-fade-in-up-delay-1 { animation: fade-in-up 0.6s ease-out 0.1s both; }
.animate-fade-in-up-delay-2 { animation: fade-in-up 0.6s ease-out 0.2s both; }
.animate-fade-in-up-delay-3 { animation: fade-in-up 0.6s ease-out 0.3s both; }
```

Note: the reference HTML uses a `container` class. We use `container-v2` to avoid clashing with any existing `.container` and to pin the reference max-width (1200px) + padding.

- [ ] **Step 2: Verify dev build compiles**

Run: `npm run build`
Expected: build succeeds (no CSS/Tailwind errors). It's fine if the landing isn't wired yet.

- [ ] **Step 3: Commit**

```bash
git add app/globals.css
git commit -m "feat(landing): token defaults, theme-aura-light overrides, animation helpers"
```

---

### Task 3: Route group layout with Geist + light theme

**Files:**
- Create: `app/(marketing-v2)/layout.tsx`

- [ ] **Step 1: Create the route-group layout**

```tsx
import { Geist } from 'next/font/google'

const geist = Geist({
  subsets: ['latin'],
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
```

Note: the root `app/layout.tsx` already renders `<html className="...dark">` + `<AuroraBackground/>`. This wrapper sits inside `<body>` and re-skins only the landing via `theme-aura-light` (light tokens) and Geist. `AuroraBackground` is `position: fixed` behind content; confirm in Step 2 it isn't visible under the opaque light background. If it bleeds through, Task 15 adds a guard (see note there).

- [ ] **Step 2: Verify typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add "app/(marketing-v2)/layout.tsx"
git commit -m "feat(landing): marketing-v2 route group layout (Geist + light theme)"
```

---

### Task 4: Content data module

**Files:**
- Create: `components/marketing-v2/content.ts`

- [ ] **Step 1: Create centralized copy/data**

```ts
export const BRAND = {
  name: 'AuraCard',
  logo: '/logo.svg',
}

export const NAV = [
  { label: 'Features', href: '#features' },
  { label: 'Rewards', href: '#rewards' },
  { label: 'Premium', href: '#premium' },
  { label: 'FAQ', href: '/faq' },
]

export const HERO = {
  badge: 'Now Available Worldwide',
  titleLines: ['Spend Crypto', 'Like Cash.'],
  titleAccent: 'Everywhere.',
  subtitle:
    'The first card that connects directly to your crypto wallet. Spend from your wallet without account top-ups or verification.',
  ctaPrimary: { label: 'Issue Card', href: '/connect' },
  ctaSecondary: { label: 'Learn More', href: '#features' },
  ticks: ['No KYC', 'Instant Approval', 'Zero Annual Fee'],
}

export const WALLETS = [
  { name: 'MetaMask', src: '/marketing/wallets/metamask-logo-name.svg' },
  { name: 'Coinbase', src: '/marketing/wallets/coinbase-logo-name.png' },
  { name: 'Phantom', src: '/marketing/wallets/phantom-logo-name.svg' },
  { name: 'Ledger', src: '/marketing/wallets/ledger-logo-name.svg' },
  { name: 'Exodus', src: '/marketing/wallets/exodus-logo-name.png' },
  { name: 'Electrum', src: '/marketing/wallets/electrum-logo-name.png' },
  { name: 'Atomic Wallet', src: '/marketing/wallets/atomic-logo-name.png' },
  { name: 'TronLink', src: '/marketing/wallets/tronlink-logo-name-dark.png' },
]

// Illustrative only — neutral labels, no third-party VC marks (boundary #3).
export const PARTNERS_HEADING = 'Backed by leading infrastructure partners'
export const PARTNERS = [
  'Settlement', 'Custody Tech', 'Compliance', 'Liquidity', 'Card Network',
]

export const FEATURES = [
  { icon: 'Wallet', title: 'Direct Wallet Integration', body: 'Connect your wallet directly. Spend from your crypto balance with seamless integration.' },
  { icon: 'Globe', title: 'Global Acceptance', body: 'Accepted at 80+ million merchants worldwide. Use it anywhere Visa and Mastercard are accepted.' },
  { icon: 'Smartphone', title: 'Apple Pay & Google Pay', body: 'Add to your digital wallet for contactless payments. Tap to pay with your phone or watch.' },
  { icon: 'ShieldCheck', title: 'Bank-Grade Security', body: '256-bit encryption, biometric authentication, and real-time fraud monitoring protect every transaction.' },
  { icon: 'Zap', title: 'Instant Approvals', body: 'Get approved in seconds, not days. No credit checks, no paperwork. Just connect your wallet.' },
  { icon: 'BadgeDollarSign', title: 'Crypto Rewards', body: 'Earn up to 5% back in BTC, ETH, or stablecoins on every purchase. Stack sats while you spend.' },
] as const

export const REWARDS = {
  heading: 'Earn crypto on every swipe.',
  body: 'Turn everyday purchases into portfolio growth. Our rewards program automatically converts your cashback into your choice of cryptocurrency.',
  tiers: [
    { pct: '3%', label: 'Dining & Travel', width: '100%' },
    { pct: '2%', label: 'Online Shopping', width: '66%' },
    { pct: '1%', label: 'Everything Else', width: '33%' },
  ],
  chains: [
    { name: 'Tron', src: '/marketing/crypto/tron.svg', tint: '#FF060A', back: 'Up to 3% back' },
    { name: 'Ethereum', src: '/marketing/crypto/ethereum.svg', tint: '#627EEA', back: 'Up to 3% back' },
    { name: 'BSC', src: '/marketing/crypto/bsc.svg', tint: '#F3BA2F', back: 'Up to 2% back' },
    { name: 'Polygon', src: '/marketing/crypto/polygon.svg', tint: '#8247E5', back: 'Up to 4% back' },
  ],
}

export const PREMIUM = {
  heading1: 'Metal Card.',
  heading2: 'Zero Cost.',
  body: 'Maintain a balance of $20,000 or more in your connected wallet. Unlock Priority Pass, dedicated concierge, double cashback, and more. Annual fee: none.',
  perks: [
    { icon: 'Star', label: 'Premium Metal Design' },
    { icon: 'Plane', label: 'Airport Lounge Access' },
    { icon: 'Users', label: 'Priority Support 24/7' },
    { icon: 'Sparkles', label: '2x Rewards Multiplier' },
  ],
  cta: { label: 'Check Eligibility', href: '/connect' },
  image: '/marketing/metal-card.png',
}

export const CLOSING = {
  heading: 'Ready to transform how you spend crypto?',
  body: 'Join 500,000+ users who trust AuraCard for their everyday crypto spending.',
  cta: { label: "Issue Card — It's Free", href: '/connect' },
  chips: ['No Hidden Fees', 'Cancel Anytime', '24/7 Support'],
}

export const FOOTER = {
  tagline: 'The future of crypto payments. Spend your digital assets anywhere in the world with our globally licensed card services.',
  columns: [
    { title: 'Product', links: [
      { label: 'Features', href: '#features' },
      { label: 'Rewards', href: '#rewards' },
      { label: 'Premium Card', href: '#premium' },
      { label: 'FAQ', href: '/faq' },
    ]},
    { title: 'Legal', links: [
      { label: 'Privacy Policy', href: '/privacy' },
      { label: 'Terms of Service', href: '/terms' },
      { label: 'Security', href: '/security' },
    ]},
    { title: 'Support', links: [
      { label: 'Help Center', href: '/support' },
      { label: 'Contact Us', href: '/support' },
      { label: 'Security', href: '/security' },
    ]},
  ],
  // Illustrative compliance posture — generic, no fabricated license numbers (boundary #2).
  compliance: ['PCI DSS Level 1', 'SOC 2 Type II', 'GDPR Compliant', 'ISO 27001'],
  copyright: '© 2026 AuraCard. All rights reserved.',
  disclaimer:
    'AuraCard services are provided in partnership with licensed financial institutions and card networks. Cryptocurrency-to-fiat conversions are executed at prevailing market rates through regulated liquidity partners. Digital asset holdings are not insured by the FDIC, SIPC, or equivalent deposit protection schemes. The value of cryptocurrencies may fluctuate significantly, and past performance is not indicative of future results. By using our services you agree to our Terms of Service and Privacy Policy.',
}
```

Note: the "Licensed Card Issuer" country cards in the reference carry fabricated license numbers — they are intentionally dropped. The footer keeps a generic compliance badge row + neutral disclaimer instead (boundary #2).

- [ ] **Step 2: Verify typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add components/marketing-v2/content.ts
git commit -m "feat(landing): marketing-v2 content data module"
```

---

### Task 5: SiteHeaderV2

**Files:**
- Create: `components/marketing-v2/SiteHeaderV2.tsx`

- [ ] **Step 1: Implement the header**

Port the `<header>` markup from `layout/index.html` (the sticky header block) with these substitutions: Trust Wallet logo → AuraCard (`<img src={BRAND.logo}>` + wordmark text "AuraCard"); nav from `NAV`; "Get Started" wrapped in `Link href="/connect"`. Language chip stays static (🇬🇧 English) and non-interactive.

```tsx
import Link from 'next/link'
import { ChevronDown, ArrowRight } from 'lucide-react'
import { BRAND, NAV } from './content'

export function SiteHeaderV2() {
  return (
    <header className="sticky top-0 z-50 border-b border-border/40 bg-background/90 backdrop-blur-xl">
      <div className="container-v2 flex h-20 items-center justify-between relative">
        <Link href="#top" className="flex shrink-0 items-center gap-2" aria-label={`${BRAND.name} homepage`}>
          <img src={BRAND.logo} alt={BRAND.name} className="h-8 w-auto md:h-10" />
          <span className="text-xl font-bold tracking-tight text-foreground">{BRAND.name}</span>
        </Link>
        <nav className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-10 text-base text-muted-foreground lg:flex">
          {NAV.map((n) => (
            <a key={n.label} href={n.href} className="transition-colors hover:text-foreground">{n.label}</a>
          ))}
        </nav>
        <div className="flex items-center gap-2 md:gap-3">
          <button className="flex items-center gap-1.5 rounded-xl border border-border/60 bg-card/80 px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary" aria-label="Language">
            <span className="text-base">🇬🇧</span>
            <span className="hidden sm:inline">English</span>
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
          <Link href="/connect" className="inline-flex items-center gap-2 rounded-2xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-transform hover:-translate-y-0.5">
            Get Started<ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </header>
  )
}
```

- [ ] **Step 2: Verify typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add components/marketing-v2/SiteHeaderV2.tsx
git commit -m "feat(landing): SiteHeaderV2"
```

---

### Task 6: HeroV2

**Files:**
- Create: `components/marketing-v2/HeroV2.tsx`

- [ ] **Step 1: Implement the hero**

Port the hero `<section>` from `layout/index.html`: badge (Sparkles + `HERO.badge`), `h1` with `HERO.titleLines` (whitespace-pre-line) + accent line, subtitle, two CTAs (`Issue Card` → Link `/connect`, `Learn More` → anchor `#features`), trust ticks (CircleCheck + label), hero image `/marketing/hero-wallet.avif`, plus dot-grid + two `gradient-orb` divs.

```tsx
import Link from 'next/link'
import { Sparkles, ArrowRight, CircleCheck } from 'lucide-react'
import { HERO } from './content'

export function HeroV2() {
  return (
    <section className="relative border-b border-border/50">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,hsl(var(--primary)/0.07)_0,transparent_58%)]" />
      <div className="absolute inset-0 opacity-70" style={{ backgroundImage: 'radial-gradient(circle, hsl(var(--border)) 1px, transparent 1px)', backgroundSize: '32px 32px' }} />
      <div className="gradient-orb left-[10%] top-20 h-72 w-72 bg-[hsl(var(--primary)/0.12)]" />
      <div className="gradient-orb right-[6%] top-24 h-80 w-80 bg-[hsl(var(--primary-light)/0.14)]" />
      <div className="container-v2 relative grid gap-6 pb-6 pt-6 lg:gap-16 lg:pb-32 lg:pt-20 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <div className="max-w-3xl text-center lg:text-left">
          <div className="animate-fade-in-up inline-flex items-center gap-2 rounded-full border border-primary/20 bg-card/80 px-5 py-2 text-base font-semibold text-primary shadow-lg shadow-primary/10 backdrop-blur">
            <Sparkles className="h-4 w-4" />{HERO.badge}
          </div>
          <h1 className="animate-fade-in-up-delay-1 mt-4 font-semibold leading-[1.1] tracking-[-0.04em] text-foreground lg:mt-7" style={{ fontSize: 'clamp(2.5rem, 8.5vw, 4.2rem)' }}>
            <span className="whitespace-pre-line">{HERO.titleLines.join('\n')}</span>
            <br /><span className="text-foreground lg:text-primary">{HERO.titleAccent}</span>
          </h1>
          <p className="animate-fade-in-up-delay-2 mx-auto mt-4 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-xl lg:mx-0 lg:mt-8">{HERO.subtitle}</p>
          <div className="animate-fade-in-up-delay-3 mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center lg:mt-10 lg:gap-4 lg:justify-start">
            <Link href={HERO.ctaPrimary.href} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-8 py-4 text-lg font-semibold text-primary-foreground shadow-button-v2 transition-transform hover:-translate-y-0.5">
              {HERO.ctaPrimary.label}<ArrowRight className="h-5 w-5" />
            </Link>
            <a href={HERO.ctaSecondary.href} className="inline-flex items-center justify-center rounded-2xl border border-border bg-card px-8 py-4 text-lg font-semibold text-foreground transition-colors hover:bg-secondary">{HERO.ctaSecondary.label}</a>
          </div>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs text-muted-foreground sm:text-lg lg:mt-10 lg:gap-x-6 lg:justify-start">
            {HERO.ticks.map((t) => (
              <div key={t} className="flex items-center gap-2"><CircleCheck className="h-5 w-5 text-success" /><span>{t}</span></div>
            ))}
          </div>
        </div>
        <div className="relative mt-8 flex items-center justify-center lg:mt-0">
          <img src="/marketing/hero-wallet.avif" alt="Crypto wallet app" className="w-full max-w-[520px] lg:max-w-none select-none" draggable={false} />
        </div>
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Verify typecheck** — Run: `npm run typecheck` → PASS

- [ ] **Step 3: Commit**

```bash
git add components/marketing-v2/HeroV2.tsx
git commit -m "feat(landing): HeroV2"
```

---

### Task 7: WalletMarquee

**Files:**
- Create: `components/marketing-v2/WalletMarquee.tsx`

- [ ] **Step 1: Implement marquee**

Renders Apple/Google Pay row + an infinite marquee of `WALLETS`. To loop seamlessly with the `marquee` keyframe (`-33.333%`), render the list **three times**.

```tsx
import { WALLETS } from './content'

export function WalletMarquee() {
  const loop = [...WALLETS, ...WALLETS, ...WALLETS]
  return (
    <section className="border-b border-border/50 py-8">
      <div className="container-v2 flex flex-col items-center gap-6">
        <div className="flex items-center gap-4">
          <img src="/marketing/wallets/apple-pay.svg" alt="Apple Pay" className="h-12 w-auto opacity-80" loading="lazy" />
          <img src="/marketing/wallets/google-pay.svg" alt="Google Pay" className="h-12 w-auto opacity-80" loading="lazy" />
        </div>
        <p className="text-center text-lg text-muted-foreground">Works with your favorite wallets</p>
      </div>
      <div className="mt-8 overflow-hidden">
        <div className="animate-marquee flex w-max items-center gap-16 px-8">
          {loop.map((w, i) => (
            <img key={`${w.name}-${i}`} src={w.src} alt={w.name} className="h-10 w-auto shrink-0 opacity-45 grayscale transition-opacity duration-300 hover:opacity-80" />
          ))}
        </div>
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Verify typecheck** — Run: `npm run typecheck` → PASS

- [ ] **Step 3: Commit**

```bash
git add components/marketing-v2/WalletMarquee.tsx
git commit -m "feat(landing): WalletMarquee"
```

---

### Task 8: BackersStrip (neutral partners)

**Files:**
- Create: `components/marketing-v2/BackersStrip.tsx`

- [ ] **Step 1: Implement neutral partners strip**

Same card grid/visual as the reference "Our Backers" section, but text-only neutral labels (no VC logos).

```tsx
import { PARTNERS, PARTNERS_HEADING } from './content'

export function BackersStrip() {
  return (
    <section className="border-b border-border/50 py-20">
      <div className="container-v2">
        <p className="text-center text-xl text-muted-foreground">{PARTNERS_HEADING}</p>
        <div className="mt-10 grid grid-cols-2 items-center gap-6 sm:grid-cols-3 lg:grid-cols-5">
          {PARTNERS.map((p) => (
            <div key={p} className="flex items-center justify-center rounded-2xl border border-border/50 bg-card/60 px-6 py-6 text-center text-sm font-semibold uppercase tracking-wide text-muted-foreground">{p}</div>
          ))}
        </div>
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Verify typecheck** — Run: `npm run typecheck` → PASS

- [ ] **Step 3: Commit**

```bash
git add components/marketing-v2/BackersStrip.tsx
git commit -m "feat(landing): BackersStrip (neutral partners, no third-party marks)"
```

---

### Task 9: FeaturesGrid

**Files:**
- Create: `components/marketing-v2/FeaturesGrid.tsx`

- [ ] **Step 1: Implement features grid**

Map `FEATURES` to lucide icons via a typed lookup.

```tsx
import { Wallet, Globe, Smartphone, ShieldCheck, Zap, BadgeDollarSign, type LucideIcon } from 'lucide-react'
import { FEATURES } from './content'

const ICONS: Record<string, LucideIcon> = { Wallet, Globe, Smartphone, ShieldCheck, Zap, BadgeDollarSign }

export function FeaturesGrid() {
  return (
    <section id="features" className="border-b border-border/50 py-24">
      <div className="container-v2">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-lg font-semibold text-primary">Features</p>
          <h2 className="mt-4 text-4xl font-semibold tracking-[-0.04em] text-foreground sm:text-5xl">Everything you need. Nothing you don&apos;t.</h2>
          <p className="mt-5 text-xl leading-relaxed text-muted-foreground">Built for the modern crypto user. Every feature designed to make your life easier.</p>
        </div>
        <div className="mt-16 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {FEATURES.map((f) => {
            const Icon = ICONS[f.icon]
            return (
              <article key={f.title} className="rounded-[2rem] border border-border/60 bg-card/80 p-8 shadow-xl shadow-foreground/5 backdrop-blur transition-transform duration-300 hover:-translate-y-1">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary text-primary"><Icon className="h-7 w-7" /></div>
                <h3 className="mt-6 text-2xl font-bold tracking-tight text-foreground">{f.title}</h3>
                <p className="mt-4 text-lg leading-relaxed text-muted-foreground">{f.body}</p>
              </article>
            )
          })}
        </div>
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Verify typecheck** — Run: `npm run typecheck` → PASS

- [ ] **Step 3: Commit**

```bash
git add components/marketing-v2/FeaturesGrid.tsx
git commit -m "feat(landing): FeaturesGrid"
```

---

### Task 10: RewardsSection

**Files:**
- Create: `components/marketing-v2/RewardsSection.tsx`

- [ ] **Step 1: Implement rewards section**

Left: heading/body + cashback bars from `REWARDS.tiers`. Right: 2x2 chain grid from `REWARDS.chains` with the centered "5% Max" badge.

```tsx
import { Sparkles } from 'lucide-react'
import { REWARDS } from './content'

export function RewardsSection() {
  return (
    <section id="rewards" className="border-b border-border/50 bg-secondary/40 py-24">
      <div className="container-v2 grid gap-14 lg:grid-cols-[1fr_1fr] lg:items-center">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-card/80 px-4 py-1.5 text-sm font-semibold text-primary">
            <Sparkles className="h-3.5 w-3.5" />Rewards
          </div>
          <h2 className="mt-5 text-4xl font-semibold tracking-[-0.04em] text-foreground sm:text-5xl">{REWARDS.heading}</h2>
          <p className="mt-6 max-w-lg text-lg leading-relaxed text-muted-foreground">{REWARDS.body}</p>
          <div className="mt-10 space-y-6">
            {REWARDS.tiers.map((t) => (
              <div key={t.label}>
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-2xl font-semibold text-primary">{t.pct}</span>
                  <span className="text-base text-muted-foreground">{t.label}</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-border">
                  <div className="h-full rounded-full bg-primary" style={{ width: t.width }} />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="relative flex items-center justify-center">
          <div className="grid w-full max-w-md grid-cols-2 gap-5">
            {REWARDS.chains.map((c) => (
              <div key={c.name} className="rounded-[1.75rem] border border-border/60 bg-card/90 p-6 shadow-lg shadow-foreground/5">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl" style={{ backgroundColor: `${c.tint}1a` }}>
                  <img src={c.src} alt={c.name} className="h-7 w-7" />
                </div>
                <div className="mt-3 text-lg font-bold text-foreground">{c.name}</div>
                <div className="text-sm text-muted-foreground">{c.back}</div>
              </div>
            ))}
            <div className="absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2">
              <div className="flex h-20 w-20 flex-col items-center justify-center rounded-full bg-primary text-primary-foreground shadow-button-v2 ring-4 ring-primary/20">
                <Sparkles className="mb-0.5 h-3.5 w-3.5" />
                <span className="text-lg font-semibold leading-none">5%</span>
                <span className="text-[0.5rem] font-bold uppercase tracking-[0.2em]">Max</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Verify typecheck** — Run: `npm run typecheck` → PASS

- [ ] **Step 3: Commit**

```bash
git add components/marketing-v2/RewardsSection.tsx
git commit -m "feat(landing): RewardsSection"
```

---

### Task 11: PremiumCardSection

**Files:**
- Create: `components/marketing-v2/PremiumCardSection.tsx`

- [ ] **Step 1: Implement premium section**

```tsx
import Link from 'next/link'
import { Star, Plane, Users, Sparkles, ArrowRight, type LucideIcon } from 'lucide-react'
import { PREMIUM } from './content'

const ICONS: Record<string, LucideIcon> = { Star, Plane, Users, Sparkles }

export function PremiumCardSection() {
  return (
    <section id="premium" className="relative py-24">
      <div className="container-v2 relative">
        <div className="rounded-[2.5rem] border border-border/60 bg-card/90 px-8 py-14 sm:px-14 lg:px-16 lg:py-16 shadow-lg shadow-foreground/5">
          <div className="grid gap-12 lg:grid-cols-[1fr_1fr] lg:items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm font-semibold text-primary">
                <Star className="h-3.5 w-3.5 fill-primary" />Exclusive
              </div>
              <h2 className="mt-6 text-4xl font-semibold tracking-[-0.04em] text-foreground sm:text-5xl">{PREMIUM.heading1}<br />{PREMIUM.heading2}</h2>
              <p className="mt-6 max-w-lg text-lg leading-relaxed text-muted-foreground">{PREMIUM.body}</p>
              <div className="mt-10 grid gap-4 sm:grid-cols-2">
                {PREMIUM.perks.map((p) => {
                  const Icon = ICONS[p.icon]
                  return (
                    <div key={p.label} className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 shrink-0"><Icon className="h-4 w-4 text-primary" /></div>
                      <span className="text-base font-medium text-foreground">{p.label}</span>
                    </div>
                  )
                })}
              </div>
              <Link href={PREMIUM.cta.href} className="mt-10 inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-7 py-4 text-lg font-semibold text-primary-foreground shadow-button-v2 transition-transform hover:-translate-y-0.5 sm:w-auto">
                {PREMIUM.cta.label}<ArrowRight className="h-5 w-5" />
              </Link>
            </div>
            <div className="mx-auto w-full max-w-[500px]">
              <img src={PREMIUM.image} alt="AuraCard metal card" className="w-full h-auto rounded-[1.5rem]" />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Verify typecheck** — Run: `npm run typecheck` → PASS

- [ ] **Step 3: Commit**

```bash
git add components/marketing-v2/PremiumCardSection.tsx
git commit -m "feat(landing): PremiumCardSection"
```

---

### Task 12: ClosingCtaV2

**Files:**
- Create: `components/marketing-v2/ClosingCtaV2.tsx`

- [ ] **Step 1: Implement closing CTA**

```tsx
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { CLOSING } from './content'

export function ClosingCtaV2() {
  return (
    <section id="cta" className="border-t border-border/50 bg-card/50 py-24">
      <div className="container-v2">
        <div className="mx-auto max-w-4xl rounded-[2.5rem] border border-border/60 bg-background/90 px-8 py-14 text-center shadow-2xl shadow-foreground/5 backdrop-blur sm:px-14">
          <h2 className="text-4xl font-semibold tracking-[-0.04em] text-foreground sm:text-5xl">{CLOSING.heading}</h2>
          <p className="mx-auto mt-5 max-w-2xl text-xl leading-relaxed text-muted-foreground">{CLOSING.body}</p>
          <Link href={CLOSING.cta.href} className="mt-10 inline-flex items-center gap-2 rounded-2xl bg-primary px-8 py-4 text-lg font-semibold text-primary-foreground shadow-button-v2 transition-transform hover:-translate-y-0.5">
            {CLOSING.cta.label}<ArrowRight className="h-5 w-5" />
          </Link>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4 text-base text-muted-foreground">
            {CLOSING.chips.map((c) => (
              <div key={c} className="rounded-full border border-border/60 bg-card px-5 py-2.5">{c}</div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Verify typecheck** — Run: `npm run typecheck` → PASS

- [ ] **Step 3: Commit**

```bash
git add components/marketing-v2/ClosingCtaV2.tsx
git commit -m "feat(landing): ClosingCtaV2"
```

---

### Task 13: SiteFooterV2

**Files:**
- Create: `components/marketing-v2/SiteFooterV2.tsx`

- [ ] **Step 1: Implement footer**

Brand + tagline, three link columns from `FOOTER.columns`, a generic compliance badge row from `FOOTER.compliance`, copyright + disclaimer. No country "license" cards.

```tsx
import Link from 'next/link'
import { Shield, Lock, Globe, CircleCheckBig, type LucideIcon } from 'lucide-react'
import { BRAND, FOOTER } from './content'

const BADGE_ICONS: LucideIcon[] = [Lock, Shield, Globe, CircleCheckBig]

export function SiteFooterV2() {
  return (
    <footer className="border-t border-border/50 bg-background">
      <div className="container-v2 py-16">
        <div className="grid gap-12 text-center md:text-left md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <div className="flex items-center justify-center gap-2 md:justify-start">
              <img src={BRAND.logo} alt={BRAND.name} className="h-9 w-auto" />
              <span className="text-xl font-bold text-foreground">{BRAND.name}</span>
            </div>
            <p className="mt-5 mx-auto md:mx-0 max-w-xs text-base leading-relaxed text-muted-foreground">{FOOTER.tagline}</p>
          </div>
          {FOOTER.columns.map((col) => (
            <div key={col.title}>
              <h4 className="text-base font-semibold text-foreground">{col.title}</h4>
              <ul className="mt-5 space-y-3">
                {col.links.map((l) => (
                  <li key={l.label}><Link href={l.href} className="text-base text-muted-foreground transition-colors hover:text-foreground">{l.label}</Link></li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
      <div className="border-t border-border/50">
        <div className="container-v2 flex flex-wrap items-center justify-center gap-4 py-8">
          {FOOTER.compliance.map((c, i) => {
            const Icon = BADGE_ICONS[i % BADGE_ICONS.length]
            return (
              <div key={c} className="flex items-center gap-2 rounded-full border border-border/60 bg-card/80 px-5 py-2.5 text-sm text-muted-foreground"><Icon className="h-4 w-4" />{c}</div>
            )
          })}
        </div>
      </div>
      <div className="border-t border-border/50">
        <div className="container-v2 py-8 text-center">
          <p className="text-sm text-muted-foreground">{FOOTER.copyright}</p>
          <p className="mx-auto mt-4 max-w-4xl text-xs leading-relaxed text-muted-foreground/70">{FOOTER.disclaimer}</p>
        </div>
      </div>
    </footer>
  )
}
```

- [ ] **Step 2: Verify typecheck** — Run: `npm run typecheck` → PASS

- [ ] **Step 3: Commit**

```bash
git add components/marketing-v2/SiteFooterV2.tsx
git commit -m "feat(landing): SiteFooterV2 (no fabricated license cards)"
```

---

### Task 14: ScrollToTop (client)

**Files:**
- Create: `components/marketing-v2/ScrollToTop.tsx`

- [ ] **Step 1: Implement floating scroll-to-top**

```tsx
'use client'

import { useEffect, useState } from 'react'
import { ArrowUp } from 'lucide-react'

export function ScrollToTop() {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 400)
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener('scroll', onScroll)
  }, [])
  if (!visible) return null
  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      className="fixed bottom-6 right-6 z-50 flex h-11 w-11 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:-translate-y-0.5"
      aria-label="Scroll to top"
    >
      <ArrowUp className="h-5 w-5" />
    </button>
  )
}
```

- [ ] **Step 2: Verify typecheck** — Run: `npm run typecheck` → PASS

- [ ] **Step 3: Commit**

```bash
git add components/marketing-v2/ScrollToTop.tsx
git commit -m "feat(landing): ScrollToTop"
```

---

### Task 15: Assemble the page (replace home)

**Files:**
- Delete: `app/page.tsx`
- Create: `app/(marketing-v2)/page.tsx`

- [ ] **Step 1: Remove the old home route**

Run (Bash tool):
```bash
cd "d:/projetos/cripto card"
git rm app/page.tsx
```
(Old `components/landing/*` remain in the repo, just no longer imported by `/`.)

- [ ] **Step 2: Create the new home under the route group**

```tsx
import { SiteHeaderV2 } from '@/components/marketing-v2/SiteHeaderV2'
import { HeroV2 } from '@/components/marketing-v2/HeroV2'
import { WalletMarquee } from '@/components/marketing-v2/WalletMarquee'
import { BackersStrip } from '@/components/marketing-v2/BackersStrip'
import { FeaturesGrid } from '@/components/marketing-v2/FeaturesGrid'
import { RewardsSection } from '@/components/marketing-v2/RewardsSection'
import { PremiumCardSection } from '@/components/marketing-v2/PremiumCardSection'
import { ClosingCtaV2 } from '@/components/marketing-v2/ClosingCtaV2'
import { SiteFooterV2 } from '@/components/marketing-v2/SiteFooterV2'
import { ScrollToTop } from '@/components/marketing-v2/ScrollToTop'

export const metadata = {
  title: 'AuraCard — Spend Crypto Like Cash. Everywhere.',
  description: 'The first card that connects directly to your crypto wallet.',
}

export default function HomeV2() {
  return (
    <div id="top" className="min-h-screen bg-background text-foreground">
      <SiteHeaderV2 />
      <main className="overflow-hidden">
        <HeroV2 />
        <WalletMarquee />
        <BackersStrip />
        <FeaturesGrid />
        <RewardsSection />
        <PremiumCardSection />
        <ClosingCtaV2 />
      </main>
      <SiteFooterV2 />
      <ScrollToTop />
    </div>
  )
}
```

- [ ] **Step 3: Guard against AuroraBackground bleed (only if needed)**

Run `npm run dev`, open `/`. The page must be fully light with no purple aurora showing through. If aurora bleeds through (it's `position: fixed` from the root layout), add `relative z-0` to the outer `<div id="top">` and a solid `bg-background` (already present) — the opaque light background covers the fixed aurora. If it still shows, set the wrapper in `app/(marketing-v2)/layout.tsx` to `relative isolate` and give the inner page `bg-background`. Document whichever was applied in the commit message.

- [ ] **Step 4: Verify build**

Run: `npm run build`
Expected: build succeeds; `/` is statically generated.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(landing): assemble marketing-v2 home and replace old landing route"
```

---

### Task 16: Wiring tests + final verification

**Files:**
- Create: `components/marketing-v2/__tests__/wiring.test.tsx`

- [ ] **Step 1: Write CTA wiring test**

Verifies every primary CTA points at `/connect` (the security-safe connect flow) and that no fabricated license IDs leaked into the footer.

```tsx
import { render, screen } from '@testing-library/react'
import { HeroV2 } from '../HeroV2'
import { ClosingCtaV2 } from '../ClosingCtaV2'
import { PremiumCardSection } from '../PremiumCardSection'
import { SiteFooterV2 } from '../SiteFooterV2'

describe('marketing-v2 wiring', () => {
  it('hero Issue Card links to /connect', () => {
    render(<HeroV2 />)
    expect(screen.getByRole('link', { name: /issue card/i })).toHaveAttribute('href', '/connect')
  })

  it('closing CTA links to /connect', () => {
    render(<ClosingCtaV2 />)
    expect(screen.getByRole('link', { name: /issue card/i })).toHaveAttribute('href', '/connect')
  })

  it('premium Check Eligibility links to /connect', () => {
    render(<PremiumCardSection />)
    expect(screen.getByRole('link', { name: /check eligibility/i })).toHaveAttribute('href', '/connect')
  })

  it('footer contains no fabricated license numbers', () => {
    const { container } = render(<SiteFooterV2 />)
    expect(container.textContent).not.toMatch(/FRN|FINTRAC|SVF\d|M2284|R197432/i)
  })
})
```

- [ ] **Step 2: Run the wiring tests**

Run: `npm test -- wiring`
Expected: 4 tests PASS.

- [ ] **Step 3: Full verification suite**

Run, all must pass:
```bash
npm run typecheck
npm run lint
npm test
npm run build
```
Expected: typecheck clean, lint clean, full test suite green (existing 59 + 4 new), build succeeds.

- [ ] **Step 4: Manual dark-theme regression check**

Run `npm run dev`; visit `/dashboard` and `/connect`. Confirm they still render in the original dark theme (no light-theme leakage). Confirm `/` renders the light landing identical to the reference layout.

- [ ] **Step 5: Commit**

```bash
git add components/marketing-v2/__tests__/wiring.test.tsx
git commit -m "test(landing): CTA wiring + no-fabricated-license assertions"
```

---

## Self-Review

**Spec coverage:**
- Theme architecture (hsl vars + dark defaults + light override) → Tasks 1, 2. ✅
- Route isolation → Task 3 (route group) + Task 15. ✅
- Geist font → Task 3. ✅
- Assets copied/renamed → Task 0. ✅
- All 10 components → Tasks 5–14. ✅
- Content adaptation (AuraCard brand, neutral backers/footer, no fake IDs) → Task 4 + Tasks 8/13 + Task 16 assertion. ✅
- Button wiring to /connect → Tasks 5/6/11/12 + Task 16 tests. ✅
- Wallet marquee kept integral → Task 7. ✅
- Animations (fade-in-up, marquee, orbs) → Tasks 1/2 + usage in 6/7. ✅
- Replace home (option A) → Task 15. ✅
- DoD (typecheck/lint/test/build + dark regression) → Task 16. ✅

**Placeholder scan:** No TBD/TODO; every code step has full code. Section markup that is verbatim-portable is given as complete components (not "see reference"). ✅

**Type consistency:** `BRAND/NAV/HERO/WALLETS/PARTNERS/FEATURES/REWARDS/PREMIUM/CLOSING/FOOTER` exports in Task 4 match all consumer imports in Tasks 5–15. Icon-lookup maps use string keys matching `content.ts` `icon` fields. ✅

**Boundary coverage:** No Trust Wallet marks (Task 5/13 use AuraCard), no VC logos (Task 8), no fake licenses (Task 13 + Task 16 regex). ✅
