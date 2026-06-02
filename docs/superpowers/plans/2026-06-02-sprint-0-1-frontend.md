# Sprint 0 + Sprint 1 — Frontend Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up a Next.js 15 + TypeScript + Tailwind workspace and ship three mocked screens (landing, connect-wallet, dashboard) that match the wireframes pixel-faithfully.

**Architecture:** App Router pages call mock hooks from `lib/mock/` and pass data into presentational components in `components/`. All visual tokens live only in `tailwind.config.ts`. No Web3 logic, no real wallet connection, no on-chain calls — those belong to Sprint 2+.

**Tech Stack:**
- Next.js 15 (App Router) + React 19 + TypeScript 5 (strict)
- Tailwind CSS 3.4 + PostCSS + Autoprefixer
- `next/font/google` Inter (self-hosted, no CDN)
- `lucide-react` for icons
- Vitest 2 (configured; suite empty in Sprint 1)
- ESLint with `next/core-web-vitals`

**Reference spec:** [docs/superpowers/specs/2026-06-02-sprint-0-1-frontend-design.md](../specs/2026-06-02-sprint-0-1-frontend-design.md)

**Working directory:** `d:\projetos\cripto card\` (Windows path with space — keep quoted in shells).

**Conventions for every task:**
- Commits are conventional (`feat:`, `chore:`, `style:`). Frequent commits — one per task.
- Each task ends by running `npm run typecheck` and `npm run lint`. Both must pass before commit.
- No `any` without a `// reason: ...` comment.
- Never modify `.claude/hooks/block-unsafe-web3.sh` or bypass the `PreToolUse` hook.

---

## Phase 0 — Sprint 0: Project Scaffold

### Task 0.1: Initialize git repo and package.json

**Files:**
- Create: `package.json`
- Create: `.gitignore`
- Create: `.nvmrc`
- Create: `README.md`

- [ ] **Step 1: Initialize the git repo**

Run from project root:

```bash
git init
git branch -M main
```

Expected: `Initialized empty Git repository`.

- [ ] **Step 2: Create `.gitignore`**

```
# dependencies
node_modules
.pnp
.pnp.*
.yarn/*
!.yarn/patches
!.yarn/plugins
!.yarn/releases
!.yarn/versions

# testing
coverage

# next.js
.next
out

# production
build

# misc
.DS_Store
*.pem
.vscode

# debug
npm-debug.log*
yarn-debug.log*
yarn-error.log*
.pnpm-debug.log*

# env files
.env*.local
.env

# typescript
*.tsbuildinfo
next-env.d.ts
```

- [ ] **Step 3: Create `.nvmrc`**

```
20
```

- [ ] **Step 4: Create `package.json`**

```json
{
  "name": "aura-card",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "typecheck": "tsc --noEmit",
    "test": "vitest run"
  },
  "dependencies": {
    "next": "^15.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "lucide-react": "^0.460.0"
  },
  "devDependencies": {
    "typescript": "^5.6.0",
    "@types/node": "^22.0.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "tailwindcss": "^3.4.0",
    "postcss": "^8.4.0",
    "autoprefixer": "^10.4.0",
    "eslint": "^9.0.0",
    "eslint-config-next": "^15.0.0",
    "vitest": "^2.0.0"
  }
}
```

- [ ] **Step 5: Create `README.md`**

```markdown
# Aura Card

Crypto-backed credit card platform. See `CLAUDE.md` for the full brief and
`docs/superpowers/specs/` for design specs.

## Commands

- `npm run dev` — local dev server
- `npm run build` — production build
- `npm run lint` — ESLint
- `npm run typecheck` — `tsc --noEmit`
- `npm test` — Vitest (empty suite in Sprint 1)
```

- [ ] **Step 6: Install dependencies**

```bash
npm install
```

Expected: `node_modules/` populated, `package-lock.json` created. Warnings about peer deps are acceptable.

- [ ] **Step 7: Commit**

```bash
git add .gitignore .nvmrc README.md package.json package-lock.json
git commit -m "chore: initialize next.js workspace"
```

---

### Task 0.2: TypeScript, ESLint, PostCSS, Next.js configs

**Files:**
- Create: `tsconfig.json`
- Create: `.eslintrc.json`
- Create: `postcss.config.mjs`
- Create: `next.config.ts`
- Create: `vitest.config.ts`

- [ ] **Step 1: Create `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": false,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 2: Create `.eslintrc.json`**

```json
{
  "extends": ["next/core-web-vitals"],
  "rules": {
    "@next/next/no-img-element": "warn"
  }
}
```

- [ ] **Step 3: Create `postcss.config.mjs`**

```js
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
```

- [ ] **Step 4: Create `next.config.ts`**

```ts
import type { NextConfig } from 'next'

const config: NextConfig = {
  reactStrictMode: true,
}

export default config
```

- [ ] **Step 5: Create `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['**/*.test.ts', '**/*.test.tsx'],
    passWithNoTests: true,
  },
})
```

- [ ] **Step 6: Commit**

```bash
git add tsconfig.json .eslintrc.json postcss.config.mjs next.config.ts vitest.config.ts
git commit -m "chore: add typescript, eslint, postcss, next and vitest configs"
```

---

### Task 0.3: Tailwind config with design tokens

**Files:**
- Create: `tailwind.config.ts`

- [ ] **Step 1: Create `tailwind.config.ts`**

```ts
import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        background:        '#0B0B10',
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
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        'display-lg':  ['64px', { lineHeight: '1.1', letterSpacing: '-0.04em', fontWeight: '600' }],
        'headline-lg': ['40px', { lineHeight: '1.2', letterSpacing: '-0.03em', fontWeight: '600' }],
        'headline-md': ['24px', { lineHeight: '1.3', letterSpacing: '-0.01em', fontWeight: '500' }],
        'body-lg':     ['18px', { lineHeight: '1.6', fontWeight: '400' }],
        'body-md':     ['16px', { lineHeight: '1.6', fontWeight: '400' }],
        'label-md':    ['14px', { lineHeight: '1.4', letterSpacing: '0.02em', fontWeight: '500' }],
        'label-sm':    ['12px', { lineHeight: '1.2', letterSpacing: '0.05em', fontWeight: '600' }],
      },
      borderRadius: {
        sm: '0.25rem',
        DEFAULT: '0.5rem',
        md: '0.75rem',
        lg: '1rem',
        xl: '1.5rem',
      },
      spacing: {
        gutter:          '24px',
        'stack-sm':      '8px',
        'stack-md':      '16px',
        'stack-lg':      '32px',
        'margin-mobile': '20px',
        'margin-desktop':'40px',
      },
      maxWidth: {
        'container-max': '1280px',
      },
      backgroundImage: {
        'aurora-gradient': 'linear-gradient(135deg, #7C5CFF 0%, #4F8CFF 50%, #2DD4BF 100%)',
      },
      backdropBlur: {
        glass: '20px',
      },
      boxShadow: {
        'glow-violet': '0 0 20px rgba(124,92,255,0.4)',
        'glow-teal':   '0 0 8px rgba(45,212,191,0.6)',
      },
    },
  },
  plugins: [],
}

export default config
```

- [ ] **Step 2: Commit**

```bash
git add tailwind.config.ts
git commit -m "feat: add tailwind config with aura design tokens"
```

---

### Task 0.4: Root layout, globals.css, and skeleton landing page

**Files:**
- Create: `app/globals.css`
- Create: `app/layout.tsx`
- Create: `app/page.tsx` (skeleton, replaced in Phase 4)

- [ ] **Step 1: Create `app/globals.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  html, body {
    background-color: #0B0B10;
    color: #F7F9FA;
    font-family: var(--font-inter), system-ui, sans-serif;
  }
}

@layer components {
  .glass-panel {
    @apply bg-glass-fill border border-glass-border backdrop-blur-glass rounded-lg;
  }

  .text-aurora {
    background-image: linear-gradient(135deg, #7C5CFF 0%, #4F8CFF 50%, #2DD4BF 100%);
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
    color: transparent;
  }
}

@keyframes pulse-accent {
  0%, 100% { opacity: 1; transform: scale(1); }
  50%      { opacity: 0.5; transform: scale(1.1); }
}

.pulse-accent {
  animation: pulse-accent 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

@keyframes shimmer {
  0%   { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}

.shimmer {
  position: relative;
  overflow: hidden;
}

.shimmer::after {
  content: '';
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: linear-gradient(45deg, transparent 45%, rgba(255,255,255,0.1) 50%, transparent 55%);
  animation: shimmer 5s infinite linear;
}
```

- [ ] **Step 2: Create `app/layout.tsx`**

```tsx
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
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
      <body className="bg-background text-text-primary antialiased min-h-screen">
        {children}
      </body>
    </html>
  )
}
```

- [ ] **Step 3: Create skeleton `app/page.tsx`** (will be replaced in Task 4.4)

```tsx
export default function LandingPage() {
  return (
    <main className="flex min-h-screen items-center justify-center">
      <h1 className="font-sans text-headline-md text-text-primary">
        Aura — scaffold up
      </h1>
    </main>
  )
}
```

- [ ] **Step 4: Run typecheck and lint**

```bash
npm run typecheck
npm run lint
```

Expected: both pass clean.

- [ ] **Step 5: Smoke-test dev server**

```bash
npm run dev
```

Open `http://localhost:3000` — confirm the dark background renders and the headline is visible in Inter. Then stop the server (`Ctrl+C`).

- [ ] **Step 6: Commit**

```bash
git add app/globals.css app/layout.tsx app/page.tsx
git commit -m "feat: add root layout, globals.css, and skeleton landing"
```

---

### Task 0.5: AuroraBackground component + logo placeholder

**Files:**
- Create: `components/layout/AuroraBackground.tsx`
- Create: `public/logo.svg`
- Modify: `app/layout.tsx` (add `<AuroraBackground />`)

- [ ] **Step 1: Create `components/layout/AuroraBackground.tsx`**

```tsx
export function AuroraBackground() {
  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 -z-10 overflow-hidden pointer-events-none"
    >
      <div className="absolute -top-24 -left-24 h-[600px] w-[600px] rounded-full bg-aurora-violet/20 blur-[120px]" />
      <div className="absolute -bottom-24 -right-24 h-[500px] w-[500px] rounded-full bg-aurora-teal/15 blur-[100px]" />
    </div>
  )
}
```

- [ ] **Step 2: Create `public/logo.svg`** (typographic "A" on aurora gradient)

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40" width="40" height="40">
  <defs>
    <linearGradient id="aura" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#7C5CFF"/>
      <stop offset="50%" stop-color="#4F8CFF"/>
      <stop offset="100%" stop-color="#2DD4BF"/>
    </linearGradient>
  </defs>
  <rect x="0" y="0" width="40" height="40" rx="10" fill="url(#aura)"/>
  <text x="20" y="27" text-anchor="middle" fill="#0B0B10"
        font-family="Inter, system-ui, sans-serif" font-weight="700" font-size="22">
    A
  </text>
</svg>
```

- [ ] **Step 3: Wire AuroraBackground in `app/layout.tsx`**

Replace the body of the file with:

```tsx
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
```

- [ ] **Step 4: Run typecheck and lint**

```bash
npm run typecheck
npm run lint
```

Expected: both pass.

- [ ] **Step 5: Commit**

```bash
git add components/layout/AuroraBackground.tsx public/logo.svg app/layout.tsx
git commit -m "feat: add aurora background and logo placeholder"
```

---

### Task 0.6: Format helpers, mock types skeleton, reserved namespaces

**Files:**
- Create: `lib/format.ts`
- Create: `lib/web3/.gitkeep`
- Create: `lib/mock/types.ts` (full types — used in Phase 2)

- [ ] **Step 1: Create `lib/format.ts`**

```ts
import type { Address } from './mock/types'

export function formatUSD(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value)
}

export function formatCompactUSD(value: number): string {
  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 1,
  }).format(value)
}

export function truncateAddress(address: Address): string {
  return `${address.slice(0, 6)}…${address.slice(-4)}`
}
```

- [ ] **Step 2: Create `lib/mock/types.ts`**

```ts
export type Address = `0x${string}`

export type AssetSymbol = 'BTC' | 'ETH' | 'USDC'

export interface AssetBalance {
  symbol: AssetSymbol
  name: string
  amountRaw: bigint
  decimals: number
  amountDisplay: string
  usdValue: number
}

export type StepStatus = 'completed' | 'in_progress' | 'pending'
export type StepId = 'wallet_connected' | 'asset_analysis' | 'approval' | 'card_issued'

export interface ApprovalStep {
  id: StepId
  label: string
  status: StepStatus
  caption: string
}

export interface ApprovalProgress {
  steps: ApprovalStep[]
  percent: number
  etaLabel: string
}

export interface EligibleBalance {
  totalUsd: number
  assets: AssetBalance[]
}

export interface EstimatedLimit {
  limitUsd: number
  utilizationPercent: number
  utilizationCaption: string
}

export type TimelineEventStatus = 'completed' | 'in_progress' | 'pending'

export interface TimelineEvent {
  id: string
  title: string
  description: string
  status: TimelineEventStatus
  timestamp: string
}

export interface WalletSession {
  address: Address
  addressShort: string
  chainId: number
  chainName: string
}

export interface DashboardData {
  wallet: WalletSession
  progress: ApprovalProgress
  balance: EligibleBalance
  limit: EstimatedLimit
  timeline: TimelineEvent[]
}
```

- [ ] **Step 3: Create `lib/web3/.gitkeep`**

Empty file. Reserves the namespace for Sprint 2+.

PowerShell:
```powershell
New-Item -ItemType File -Path lib\web3\.gitkeep -Force
```

Or bash:
```bash
mkdir -p lib/web3 && touch lib/web3/.gitkeep
```

- [ ] **Step 4: Run typecheck and lint**

```bash
npm run typecheck
npm run lint
```

Expected: both pass.

- [ ] **Step 5: Commit**

```bash
git add lib/format.ts lib/mock/types.ts lib/web3/.gitkeep
git commit -m "feat: add format helpers, mock types, and reserve lib/web3"
```

---

### Task 0.7: Verify Sprint 0 definition of done

- [ ] **Step 1: Run all DoD commands**

```bash
npm run typecheck
npm run lint
npm run build
npm test
```

Expected:
- `typecheck` — no output (pass).
- `lint` — `✔ No ESLint warnings or errors`.
- `build` — production build succeeds; landing route appears in the route summary.
- `test` — `0 tests passed`, exit code 0 (vitest `passWithNoTests`).

- [ ] **Step 2: Smoke-test dev server**

```bash
npm run dev
```

Open `http://localhost:3000`. Confirm:
- Background is `#0B0B10`.
- Aurora blobs are subtly visible (violet top-left, teal bottom-right).
- Headline renders in Inter.

Stop the server.

- [ ] **Step 3: Verify `.claude/hooks/block-unsafe-web3.sh` is untouched**

```bash
git status .claude/hooks/block-unsafe-web3.sh
```

Expected: no output (file unchanged).

- [ ] **Step 4: Commit the lockfile if any drift**

```bash
git status
git add -A
git diff --cached --stat
```

If `git status` is clean, no commit needed. If anything changed:

```bash
git commit -m "chore: lock sprint 0 scaffold"
```

---

## Phase 1 — UI Primitives

All primitives live in `components/ui/`. They are presentational — no data
fetching, no mock imports.

### Task 1.1: Panel (glassmorphism container)

**Files:**
- Create: `components/ui/Panel.tsx`

- [ ] **Step 1: Create `components/ui/Panel.tsx`**

```tsx
import type { ElementType, HTMLAttributes } from 'react'

type PanelProps = HTMLAttributes<HTMLElement> & {
  as?: ElementType
  rounded?: 'lg' | 'xl'
}

export function Panel({
  as: Component = 'div',
  rounded = 'lg',
  className = '',
  children,
  ...rest
}: PanelProps) {
  const radius = rounded === 'xl' ? 'rounded-xl' : 'rounded-lg'
  return (
    <Component
      className={`bg-glass-fill border border-glass-border backdrop-blur-glass ${radius} ${className}`}
      {...rest}
    >
      {children}
    </Component>
  )
}
```

- [ ] **Step 2: Run typecheck and lint**

```bash
npm run typecheck
npm run lint
```

Expected: pass.

- [ ] **Step 3: Commit**

```bash
git add components/ui/Panel.tsx
git commit -m "feat(ui): add Panel glassmorphism container"
```

---

### Task 1.2: GradientButton and GhostButton

**Files:**
- Create: `components/ui/GradientButton.tsx`
- Create: `components/ui/GhostButton.tsx`

- [ ] **Step 1: Create `components/ui/GradientButton.tsx`**

```tsx
import Link from 'next/link'
import type { ReactNode } from 'react'

type Size = 'md' | 'lg' | 'xl'
type IconPosition = 'left' | 'right'

interface CommonProps {
  children: ReactNode
  size?: Size
  icon?: ReactNode
  iconPosition?: IconPosition
  className?: string
}

type GradientButtonProps =
  | (CommonProps & { href: string; onClick?: never; type?: never })
  | (CommonProps & { href?: undefined; onClick?: () => void; type?: 'button' | 'submit' })

const sizeClasses: Record<Size, string> = {
  md: 'px-6 py-2.5 text-label-md',
  lg: 'px-8 py-4 text-body-md',
  xl: 'px-10 py-5 text-headline-md',
}

export function GradientButton({
  children,
  size = 'md',
  icon,
  iconPosition = 'right',
  className = '',
  ...rest
}: GradientButtonProps) {
  const base = `inline-flex items-center justify-center gap-2 rounded-xl bg-aurora-gradient font-bold text-white transition-opacity hover:opacity-90 active:scale-[0.98] ${sizeClasses[size]} ${className}`
  const content = (
    <>
      {icon && iconPosition === 'left' && icon}
      {children}
      {icon && iconPosition === 'right' && icon}
    </>
  )
  if ('href' in rest && rest.href) {
    return <Link href={rest.href} className={base}>{content}</Link>
  }
  const { onClick, type = 'button' } = rest as { onClick?: () => void; type?: 'button' | 'submit' }
  return (
    <button type={type} onClick={onClick} className={base}>
      {content}
    </button>
  )
}
```

- [ ] **Step 2: Create `components/ui/GhostButton.tsx`**

```tsx
import Link from 'next/link'
import type { ReactNode } from 'react'

type Size = 'md' | 'lg'
type IconPosition = 'left' | 'right'

interface CommonProps {
  children: ReactNode
  size?: Size
  icon?: ReactNode
  iconPosition?: IconPosition
  className?: string
}

type GhostButtonProps =
  | (CommonProps & { href: string; onClick?: never; type?: never })
  | (CommonProps & { href?: undefined; onClick?: () => void; type?: 'button' | 'submit' })

const sizeClasses: Record<Size, string> = {
  md: 'px-6 py-2.5 text-label-md',
  lg: 'px-8 py-4 text-body-md',
}

export function GhostButton({
  children,
  size = 'md',
  icon,
  iconPosition = 'right',
  className = '',
  ...rest
}: GhostButtonProps) {
  const base = `inline-flex items-center justify-center gap-2 rounded-xl bg-glass-fill border border-glass-border font-bold text-text-primary transition-colors hover:bg-white/10 active:scale-[0.98] ${sizeClasses[size]} ${className}`
  const content = (
    <>
      {icon && iconPosition === 'left' && icon}
      {children}
      {icon && iconPosition === 'right' && icon}
    </>
  )
  if ('href' in rest && rest.href) {
    return <Link href={rest.href} className={base}>{content}</Link>
  }
  const { onClick, type = 'button' } = rest as { onClick?: () => void; type?: 'button' | 'submit' }
  return (
    <button type={type} onClick={onClick} className={base}>
      {content}
    </button>
  )
}
```

- [ ] **Step 3: Run typecheck and lint**

```bash
npm run typecheck
npm run lint
```

Expected: pass.

- [ ] **Step 4: Commit**

```bash
git add components/ui/GradientButton.tsx components/ui/GhostButton.tsx
git commit -m "feat(ui): add GradientButton and GhostButton"
```

---

### Task 1.3: Chip and IconBadge

**Files:**
- Create: `components/ui/Chip.tsx`
- Create: `components/ui/IconBadge.tsx`

- [ ] **Step 1: Create `components/ui/Chip.tsx`**

```tsx
import type { ReactNode } from 'react'

type Tone = 'violet' | 'teal' | 'blue' | 'neutral'

interface ChipProps {
  children: ReactNode
  tone?: Tone
  className?: string
}

const toneClasses: Record<Tone, string> = {
  violet:  'bg-aurora-violet/15 text-aurora-violet',
  teal:    'bg-aurora-teal/15   text-aurora-teal',
  blue:    'bg-aurora-blue/15   text-aurora-blue',
  neutral: 'bg-white/10         text-text-secondary',
}

export function Chip({ children, tone = 'neutral', className = '' }: ChipProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-label-sm font-semibold uppercase tracking-wider ${toneClasses[tone]} ${className}`}
    >
      {children}
    </span>
  )
}
```

- [ ] **Step 2: Create `components/ui/IconBadge.tsx`**

```tsx
import type { ReactNode } from 'react'

type Tone = 'violet' | 'teal' | 'blue' | 'orange'
type Size = 'sm' | 'md' | 'lg'

interface IconBadgeProps {
  icon: ReactNode
  tone?: Tone
  size?: Size
  className?: string
}

const toneClasses: Record<Tone, string> = {
  violet: 'bg-aurora-violet/20 text-aurora-violet',
  teal:   'bg-aurora-teal/20   text-aurora-teal',
  blue:   'bg-aurora-blue/20   text-aurora-blue',
  orange: 'bg-orange-500/20    text-orange-500',
}

const sizeClasses: Record<Size, string> = {
  sm: 'h-8  w-8  rounded-full',
  md: 'h-10 w-10 rounded-md',
  lg: 'h-12 w-12 rounded-xl',
}

export function IconBadge({ icon, tone = 'violet', size = 'lg', className = '' }: IconBadgeProps) {
  return (
    <div
      className={`flex items-center justify-center ${toneClasses[tone]} ${sizeClasses[size]} ${className}`}
    >
      {icon}
    </div>
  )
}
```

- [ ] **Step 3: Run typecheck and lint**

```bash
npm run typecheck
npm run lint
```

Expected: pass.

- [ ] **Step 4: Commit**

```bash
git add components/ui/Chip.tsx components/ui/IconBadge.tsx
git commit -m "feat(ui): add Chip and IconBadge"
```

---

### Task 1.4: ProgressBar and ProgressRing

**Files:**
- Create: `components/ui/ProgressBar.tsx`
- Create: `components/ui/ProgressRing.tsx`

- [ ] **Step 1: Create `components/ui/ProgressBar.tsx`**

```tsx
interface ProgressBarProps {
  percent: number
  className?: string
}

export function ProgressBar({ percent, className = '' }: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, percent))
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={clamped}
      className={`h-1.5 w-full overflow-hidden rounded-full bg-white/10 ${className}`}
    >
      <div
        className="h-full bg-aurora-gradient transition-all duration-1000"
        style={{ width: `${clamped}%` }}
      />
    </div>
  )
}
```

- [ ] **Step 2: Create `components/ui/ProgressRing.tsx`**

```tsx
interface ProgressRingProps {
  percent: number
  label: string
  caption: string
  size?: number
  strokeWidth?: number
}

export function ProgressRing({
  percent,
  label,
  caption,
  size = 192,
  strokeWidth = 8,
}: ProgressRingProps) {
  const clamped = Math.max(0, Math.min(100, percent))
  const radius = 40
  const circumference = 2 * Math.PI * radius
  const offset = circumference * (1 - clamped / 100)
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
        <circle
          cx="50" cy="50" r={radius}
          fill="transparent" stroke="rgba(255,255,255,0.05)" strokeWidth={strokeWidth}
        />
        <circle
          cx="50" cy="50" r={radius}
          fill="transparent"
          stroke="#2DD4BF"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-[stroke-dashoffset] duration-700"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-headline-md font-bold text-text-primary">{label}</span>
        <span className="text-label-sm text-text-secondary">{caption}</span>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Run typecheck and lint**

```bash
npm run typecheck
npm run lint
```

Expected: pass.

- [ ] **Step 4: Commit**

```bash
git add components/ui/ProgressBar.tsx components/ui/ProgressRing.tsx
git commit -m "feat(ui): add ProgressBar and ProgressRing"
```

---

### Task 1.5: StepDot

**Files:**
- Create: `components/ui/StepDot.tsx`

- [ ] **Step 1: Create `components/ui/StepDot.tsx`**

```tsx
import { Check } from 'lucide-react'
import type { ReactNode } from 'react'
import type { StepStatus } from '@/lib/mock/types'

interface StepDotProps {
  status: StepStatus
  icon: ReactNode        // shown when status is in_progress or pending
}

export function StepDot({ status, icon }: StepDotProps) {
  if (status === 'completed') {
    return (
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-aurora-gradient shadow-glow-violet">
        <Check className="h-6 w-6 text-white" strokeWidth={2.5} />
      </div>
    )
  }
  if (status === 'in_progress') {
    return (
      <div className="pulse-accent flex h-12 w-12 items-center justify-center rounded-full border-2 border-aurora-violet bg-aurora-violet/20 text-aurora-violet">
        {icon}
      </div>
    )
  }
  return (
    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-text-secondary">
      {icon}
    </div>
  )
}
```

- [ ] **Step 2: Run typecheck and lint**

```bash
npm run typecheck
npm run lint
```

Expected: pass.

- [ ] **Step 3: Commit**

```bash
git add components/ui/StepDot.tsx
git commit -m "feat(ui): add StepDot for approval stepper"
```

---

## Phase 2 — Mock Data Layer

### Task 2.1: Frozen mock data and hooks

**Files:**
- Create: `lib/mock/data.ts`
- Create: `lib/mock/hooks.ts`

- [ ] **Step 1: Create `lib/mock/data.ts`**

```ts
import type {
  ApprovalProgress,
  DashboardData,
  EligibleBalance,
  EstimatedLimit,
  TimelineEvent,
  WalletSession,
} from './types'

export const MOCK_WALLET: WalletSession = {
  address: '0x71C0000000000000000000000000000000004f31',
  addressShort: '0x71C0…4f31',
  chainId: 1,
  chainName: 'Ethereum',
}

export const MOCK_PROGRESS: ApprovalProgress = {
  percent: 45,
  etaLabel: 'Estimated completion: ~2h',
  steps: [
    { id: 'wallet_connected', label: 'Wallet connected', status: 'completed',   caption: 'Completed' },
    { id: 'asset_analysis',   label: 'Asset analysis',   status: 'in_progress', caption: 'In progress' },
    { id: 'approval',         label: 'Approval',         status: 'pending',     caption: 'Pending' },
    { id: 'card_issued',      label: 'Card issued',      status: 'pending',     caption: 'Pending' },
  ],
}

export const MOCK_BALANCE: EligibleBalance = {
  totalUsd: 28_500,
  assets: [
    {
      symbol: 'BTC',
      name: 'Bitcoin',
      amountRaw: 45_000_000n,
      decimals: 8,
      amountDisplay: '0.45',
      usdValue: 18_900,
    },
    {
      symbol: 'ETH',
      name: 'Ethereum',
      amountRaw: 12_800_000_000_000_000_000n,
      decimals: 18,
      amountDisplay: '12.8',
      usdValue: 4_600,
    },
    {
      symbol: 'USDC',
      name: 'USDC',
      amountRaw: 5_000_000_000n,
      decimals: 6,
      amountDisplay: '5,000',
      usdValue: 5_000,
    },
  ],
}

export const MOCK_LIMIT: EstimatedLimit = {
  limitUsd: 9_000,
  utilizationPercent: 70,
  utilizationCaption: '70% ideal utilization rate',
}

export const MOCK_TIMELINE: TimelineEvent[] = [
  {
    id: 'liquidity',
    title: 'Liquidity verification completed',
    description: 'Assets verified across 3 networks',
    status: 'completed',
    timestamp: '10:42 AM',
  },
  {
    id: 'score',
    title: 'On-chain credit score',
    description: 'Processing transactional history (EVM)',
    status: 'in_progress',
    timestamp: 'Now',
  },
  {
    id: 'keys',
    title: 'Cryptographic key generation',
    description: 'Pending final approval',
    status: 'pending',
    timestamp: '—',
  },
]

export const MOCK_DASHBOARD: DashboardData = {
  wallet:   MOCK_WALLET,
  progress: MOCK_PROGRESS,
  balance:  MOCK_BALANCE,
  limit:    MOCK_LIMIT,
  timeline: MOCK_TIMELINE,
}
```

- [ ] **Step 2: Create `lib/mock/hooks.ts`**

```ts
'use client'

import { MOCK_DASHBOARD, MOCK_WALLET } from './data'
import type { DashboardData, WalletSession } from './types'

export function useDashboardMock(): DashboardData {
  return MOCK_DASHBOARD
}

export function useWalletMock(): WalletSession {
  return MOCK_WALLET
}
```

- [ ] **Step 3: Run typecheck and lint**

```bash
npm run typecheck
npm run lint
```

Expected: pass.

- [ ] **Step 4: Commit**

```bash
git add lib/mock/data.ts lib/mock/hooks.ts
git commit -m "feat(mock): add frozen dashboard mock data and hooks"
```

---

## Phase 3 — Layout Components

### Task 3.1: TopNav and Footer

**Files:**
- Create: `components/layout/TopNav.tsx`
- Create: `components/layout/Footer.tsx`

- [ ] **Step 1: Create `components/layout/TopNav.tsx`**

```tsx
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
```

- [ ] **Step 2: Create `components/layout/Footer.tsx`**

```tsx
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
```

- [ ] **Step 3: Run typecheck and lint**

```bash
npm run typecheck
npm run lint
```

Expected: pass.

- [ ] **Step 4: Commit**

```bash
git add components/layout/TopNav.tsx components/layout/Footer.tsx
git commit -m "feat(layout): add TopNav and Footer"
```

---

### Task 3.2: Sidebar, MobileTabBar, BrandingAnchor

**Files:**
- Create: `components/layout/Sidebar.tsx`
- Create: `components/layout/MobileTabBar.tsx`
- Create: `components/layout/BrandingAnchor.tsx`

- [ ] **Step 1: Create `components/layout/Sidebar.tsx`**

```tsx
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
```

- [ ] **Step 2: Create `components/layout/MobileTabBar.tsx`**

```tsx
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
```

- [ ] **Step 3: Create `components/layout/BrandingAnchor.tsx`**

```tsx
export function BrandingAnchor() {
  return (
    <div className="pointer-events-none fixed bottom-gutter left-0 right-0 flex justify-center">
      <div className="flex items-center gap-2 opacity-40">
        <span className="text-headline-md font-bold tracking-tight text-text-primary">Aura</span>
        <span className="text-label-sm uppercase tracking-widest text-aurora-teal">Finance</span>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run typecheck and lint**

```bash
npm run typecheck
npm run lint
```

Expected: pass.

- [ ] **Step 5: Commit**

```bash
git add components/layout/Sidebar.tsx components/layout/MobileTabBar.tsx components/layout/BrandingAnchor.tsx
git commit -m "feat(layout): add Sidebar, MobileTabBar, BrandingAnchor"
```

---

## Phase 4 — Landing Page

### Task 4.1: CardVisualizer

**Files:**
- Create: `components/card/CardVisualizer.tsx`

- [ ] **Step 1: Create `components/card/CardVisualizer.tsx`**

```tsx
'use client'

import Image from 'next/image'
import { useRef } from 'react'

export function CardVisualizer() {
  const cardRef = useRef<HTMLDivElement>(null)

  function onMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const card = cardRef.current
    if (!card) return
    const rect = card.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const rx = (y - rect.height / 2) / 20
    const ry = (rect.width / 2 - x) / 20
    card.style.transform = `perspective(1000px) rotateX(${rx}deg) rotateY(${ry}deg)`
  }

  function onMouseLeave() {
    if (cardRef.current) {
      cardRef.current.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg)'
    }
  }

  return (
    <div
      className="group relative"
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
    >
      <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-aurora-violet to-aurora-teal opacity-25 blur transition duration-1000 group-hover:opacity-40" />
      <div
        ref={cardRef}
        className="shimmer relative flex aspect-[1.58/1] flex-col justify-between overflow-hidden rounded-3xl border border-glass-border bg-glass-fill p-8 shadow-2xl backdrop-blur-glass transition-transform"
      >
        <div className="flex items-start justify-between">
          <div className="flex flex-col">
            <span className="text-label-sm uppercase tracking-[0.2em] text-text-secondary">Aura Elite</span>
            <div className="relative mt-4 h-10 w-12 rounded-md bg-gradient-to-br from-yellow-600 to-yellow-200 opacity-80">
              <div className="absolute inset-0 rounded-md border border-white/20" />
            </div>
          </div>
          <Image src="/logo.svg" alt="" width={48} height={48} className="opacity-80" aria-hidden />
        </div>
        <div className="space-y-4">
          <div className="text-headline-md tracking-[0.1em] text-white/90">
            •••• •••• •••• 8821
          </div>
          <div className="flex items-end justify-between">
            <div className="flex flex-col">
              <span className="text-[10px] uppercase tracking-widest text-text-secondary">Card Holder</span>
              <span className="text-label-md text-white">GENESIS MEMBER</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-red-500/80 mix-blend-screen" />
              <div className="-ml-4 h-8 w-8 rounded-full bg-orange-500/80 mix-blend-screen" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Run typecheck and lint**

```bash
npm run typecheck
npm run lint
```

Expected: pass.

- [ ] **Step 3: Commit**

```bash
git add components/card/CardVisualizer.tsx
git commit -m "feat(card): add CardVisualizer with shimmer and tilt"
```

---

### Task 4.2: Hero

**Files:**
- Create: `components/landing/Hero.tsx`

- [ ] **Step 1: Create `components/landing/Hero.tsx`**

```tsx
import { ArrowRight } from 'lucide-react'
import { GradientButton } from '@/components/ui/GradientButton'
import { GhostButton } from '@/components/ui/GhostButton'
import { CardVisualizer } from '@/components/card/CardVisualizer'

export function Hero() {
  return (
    <section className="grid grid-cols-1 items-center gap-16 py-20 md:py-32 lg:grid-cols-2">
      <div className="space-y-stack-lg">
        <h1 className="max-w-xl text-headline-lg text-text-primary md:text-[40px]">
          Your on-chain wealth, now in the real world
        </h1>
        <p className="max-w-lg text-body-lg text-text-secondary">
          The first luxury credit card backed by your crypto. No bureaucracy,
          instant approval.
        </p>
        <div className="flex flex-col gap-stack-md pt-4 sm:flex-row">
          <GradientButton
            href="/connect"
            size="lg"
            icon={<ArrowRight className="h-5 w-5" />}
            iconPosition="right"
          >
            Connect wallet
          </GradientButton>
          <GhostButton href="#benefits" size="lg">
            View benefits
          </GhostButton>
        </div>
      </div>
      <CardVisualizer />
    </section>
  )
}
```

- [ ] **Step 2: Run typecheck and lint**

```bash
npm run typecheck
npm run lint
```

Expected: pass.

- [ ] **Step 3: Commit**

```bash
git add components/landing/Hero.tsx
git commit -m "feat(landing): add Hero section"
```

---

### Task 4.3: BenefitsGrid, HowItWorks, ClosingCTA

**Files:**
- Create: `components/landing/BenefitsGrid.tsx`
- Create: `components/landing/HowItWorks.tsx`
- Create: `components/landing/ClosingCTA.tsx`

- [ ] **Step 1: Create `components/landing/BenefitsGrid.tsx`**

```tsx
import { Landmark, ShieldCheck, ScrollText } from 'lucide-react'
import { Panel } from '@/components/ui/Panel'
import { IconBadge } from '@/components/ui/IconBadge'

const benefits = [
  {
    title: 'No bank',
    description: 'Complete independence from traditional financial institutions and excessive bureaucracy.',
    icon: <Landmark className="h-6 w-6" />,
    tone: 'violet' as const,
  },
  {
    title: 'Crypto-backed',
    description: 'Use your assets as collateral without selling them — keep your upside.',
    icon: <ShieldCheck className="h-6 w-6" />,
    tone: 'teal' as const,
  },
  {
    title: 'On-chain approval',
    description: 'Eligibility based entirely on your wallet history and digital liquidity.',
    icon: <ScrollText className="h-6 w-6" />,
    tone: 'blue' as const,
  },
]

export function BenefitsGrid() {
  return (
    <section id="benefits" className="grid grid-cols-1 gap-8 py-20 md:grid-cols-3">
      {benefits.map(({ title, description, icon, tone }) => (
        <Panel key={title} rounded="xl" className="flex flex-col gap-4 p-stack-lg">
          <IconBadge icon={icon} tone={tone} />
          <h3 className="text-headline-md text-text-primary">{title}</h3>
          <p className="text-body-md text-text-secondary">{description}</p>
        </Panel>
      ))}
    </section>
  )
}
```

- [ ] **Step 2: Create `components/landing/HowItWorks.tsx`**

```tsx
const steps = [
  { number: 1, title: 'Connect your wallet',     description: 'MetaMask, WalletConnect, or Ledger — fully secure.' },
  { number: 2, title: 'We analyze your assets',  description: 'Our protocol scores your on-chain liquidity in seconds.' },
  { number: 3, title: 'Receive your card',       description: 'Instant digital access and VIP physical delivery.' },
]

export function HowItWorks() {
  return (
    <section className="py-20 md:py-32">
      <div className="mb-16 space-y-4 text-center">
        <h2 className="text-headline-lg text-text-primary">How it works</h2>
        <p className="mx-auto max-w-2xl text-body-lg text-text-secondary">
          Your path to digital luxury in three simple, secure steps.
        </p>
      </div>
      <div className="relative grid grid-cols-1 gap-12 md:grid-cols-3">
        <div className="absolute left-[10%] right-[10%] top-1/4 hidden h-px bg-glass-border md:block" />
        {steps.map(({ number, title, description }) => (
          <div key={number} className="relative flex flex-col items-center gap-6 text-center">
            <div className="z-10 flex h-16 w-16 items-center justify-center rounded-full border border-glass-border bg-glass-fill backdrop-blur-glass">
              <span className="text-aurora text-headline-md font-bold">{number}</span>
            </div>
            <div className="space-y-2">
              <h4 className="text-headline-md text-text-primary">{title}</h4>
              <p className="text-body-md text-text-secondary">{description}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
```

- [ ] **Step 3: Create `components/landing/ClosingCTA.tsx`**

```tsx
import { Star } from 'lucide-react'
import { Panel } from '@/components/ui/Panel'
import { GradientButton } from '@/components/ui/GradientButton'

export function ClosingCTA() {
  return (
    <section className="py-20">
      <Panel rounded="xl" className="relative overflow-hidden p-12 text-center md:p-20">
        <div className="absolute right-0 top-0 h-64 w-64 bg-aurora-violet/20 blur-[80px]" />
        <div className="absolute bottom-0 left-0 h-64 w-64 bg-aurora-teal/20 blur-[80px]" />
        <div className="relative z-10 space-y-8">
          <h2 className="text-headline-lg text-text-primary">
            Ready to raise your financial standard?
          </h2>
          <p className="mx-auto max-w-xl text-body-lg text-text-secondary">
            Join elite investors already benefiting from Aura around the world.
          </p>
          <GradientButton
            href="/connect"
            size="xl"
            icon={<Star className="h-5 w-5" />}
            iconPosition="right"
          >
            Request my Aura Card
          </GradientButton>
        </div>
      </Panel>
    </section>
  )
}
```

- [ ] **Step 4: Run typecheck and lint**

```bash
npm run typecheck
npm run lint
```

Expected: pass.

- [ ] **Step 5: Commit**

```bash
git add components/landing/BenefitsGrid.tsx components/landing/HowItWorks.tsx components/landing/ClosingCTA.tsx
git commit -m "feat(landing): add BenefitsGrid, HowItWorks, ClosingCTA"
```

---

### Task 4.4: Compose landing page and visually verify

**Files:**
- Modify: `app/page.tsx`

- [ ] **Step 1: Replace `app/page.tsx`**

```tsx
import { TopNav } from '@/components/layout/TopNav'
import { Footer } from '@/components/layout/Footer'
import { Hero } from '@/components/landing/Hero'
import { BenefitsGrid } from '@/components/landing/BenefitsGrid'
import { HowItWorks } from '@/components/landing/HowItWorks'
import { ClosingCTA } from '@/components/landing/ClosingCTA'

export default function LandingPage() {
  return (
    <>
      <TopNav />
      <main className="mx-auto max-w-container-max px-gutter md:px-margin-desktop">
        <Hero />
        <BenefitsGrid />
        <HowItWorks />
        <ClosingCTA />
      </main>
      <Footer />
    </>
  )
}
```

- [ ] **Step 2: Run typecheck and lint**

```bash
npm run typecheck
npm run lint
```

Expected: pass.

- [ ] **Step 3: Visual smoke test**

```bash
npm run dev
```

Open `http://localhost:3000` and confirm against `wireframe/aura_landing_page/screen.png`:
- TopNav: logo + Home/Cards/Investments/Security + "Connect Wallet" gradient button.
- Hero: large headline, sub-copy, two CTAs (gradient + ghost), CardVisualizer on the right with tilt-on-mousemove and shimmer.
- BenefitsGrid: three glass panels with icon badges (violet/teal/blue).
- HowItWorks: three numbered circles connected by a thin rule, gradient numbers.
- ClosingCTA: large glass panel with gradient blob accents and `Request my Aura Card` button.
- Footer: logo + 4 links + copyright.

Resize the browser to ~390px wide; confirm the nav links hide, the hero stacks, and benefits/steps become single-column.

Stop the dev server.

- [ ] **Step 4: Commit**

```bash
git add app/page.tsx
git commit -m "feat(landing): compose landing page"
```

---

## Phase 5 — Connect Wallet Screen

### Task 5.1: Wallet logo SVGs

**Files:**
- Create: `public/wallets/walletconnect.svg`
- Create: `public/wallets/metamask.svg`
- Create: `public/wallets/coinbase.svg`
- Create: `public/wallets/rainbow.svg`

- [ ] **Step 1: Create `public/wallets/walletconnect.svg`** (simple stand-in)

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none">
  <path d="M5.5 9.5c3.6-3.5 9.4-3.5 13 0l.4.4c.2.2.2.5 0 .7l-1.4 1.4c-.1.1-.3.1-.4 0l-.6-.6c-2.5-2.4-6.6-2.4-9.1 0l-.6.6c-.1.1-.3.1-.4 0L5 10.6c-.2-.2-.2-.5 0-.7l.5-.4Z" fill="#fff"/>
  <path d="M21.6 12.4 23 13.8c.2.2.2.5 0 .7l-6.3 6.1c-.2.2-.5.2-.7 0L11.5 16c-.1-.1-.2-.1-.3 0l-4.5 4.6c-.2.2-.5.2-.7 0L0 14.5c-.2-.2-.2-.5 0-.7l1.4-1.4c.2-.2.5-.2.7 0l4.5 4.4c.1.1.2.1.3 0l4.5-4.4c.2-.2.5-.2.7 0l4.5 4.4c.1.1.2.1.3 0l4.5-4.4c.2-.2.5-.2.7 0Z" fill="#fff"/>
</svg>
```

- [ ] **Step 2: Create `public/wallets/metamask.svg`** (stylized fox stand-in)

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
  <path d="M22 2 14 7l1.5-3.5L22 2Zm-20 0 8 5L8.5 3.5 2 2Zm17 14.5L17 19l4 1 1.2-3.8-3.2-.7ZM3 16.5 1.8 20.2l4-1L4 16.5l-1 0Zm6.5 1L8 19l3 1v-2l-1.5-.5Zm5 0L16 19v1l3-1-1.5-1.5h-3Z" fill="#F6851B"/>
  <path d="M4 16.5 6.5 8 9.5 17l-5.5-.5Zm15.5 0L17 8l-3 9 5.5-.5ZM12 12 9.5 17h5L12 12Z" fill="#E2761B"/>
</svg>
```

- [ ] **Step 3: Create `public/wallets/coinbase.svg`** (Coinbase-style mark)

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
  <rect width="24" height="24" rx="6" fill="#0052FF"/>
  <rect x="9" y="9" width="6" height="6" rx="1" fill="#fff"/>
</svg>
```

- [ ] **Step 4: Create `public/wallets/rainbow.svg`**

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
  <defs>
    <linearGradient id="rb" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#001AFF"/>
      <stop offset="100%" stop-color="#00E0FF"/>
    </linearGradient>
  </defs>
  <rect width="24" height="24" rx="6" fill="url(#rb)"/>
  <path d="M5 19a8 8 0 0 1 14-5" stroke="#fff" stroke-width="1.5" fill="none" stroke-linecap="round"/>
  <path d="M5 19a5 5 0 0 1 10-2" stroke="#fff" stroke-width="1.5" fill="none" stroke-linecap="round"/>
  <circle cx="5" cy="19" r="1.5" fill="#fff"/>
</svg>
```

- [ ] **Step 5: Commit**

```bash
git add public/wallets/
git commit -m "feat(connect): add local wallet logo SVGs"
```

---

### Task 5.2: WalletPicker and connect page

**Files:**
- Create: `components/connect/WalletPicker.tsx`
- Create: `app/connect/page.tsx`

- [ ] **Step 1: Create `components/connect/WalletPicker.tsx`**

```tsx
'use client'

import Image from 'next/image'
import { ChevronRight, Lock } from 'lucide-react'
import { Panel } from '@/components/ui/Panel'
import { Chip } from '@/components/ui/Chip'

type WalletId = 'walletconnect' | 'metamask' | 'coinbase' | 'rainbow'

interface WalletOptionConfig {
  id: WalletId
  name: string
  iconSrc: string
  highlighted?: boolean
}

const wallets: WalletOptionConfig[] = [
  { id: 'walletconnect', name: 'WalletConnect',  iconSrc: '/wallets/walletconnect.svg', highlighted: true },
  { id: 'metamask',      name: 'MetaMask',       iconSrc: '/wallets/metamask.svg' },
  { id: 'coinbase',      name: 'Coinbase Wallet',iconSrc: '/wallets/coinbase.svg' },
  { id: 'rainbow',       name: 'Rainbow',        iconSrc: '/wallets/rainbow.svg' },
]

function WalletOption({ wallet }: { wallet: WalletOptionConfig }) {
  function onClick() {
    // Sprint 1: no real connection. Sprint 2 wires Reown AppKit here.
    console.info('mock connect:', wallet.id)
  }

  const base = 'group flex w-full items-center justify-between rounded-lg p-4 transition-all duration-300 active:scale-[0.98]'
  const highlightStyles = wallet.highlighted
    ? 'border border-aurora-violet/30 bg-aurora-violet/10 hover:bg-aurora-violet/20'
    : 'border border-transparent bg-white/5 hover:border-glass-border hover:bg-white/10'

  return (
    <button type="button" onClick={onClick} className={`${base} ${highlightStyles}`}>
      <div className="flex items-center gap-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/5">
          <Image src={wallet.iconSrc} alt="" width={24} height={24} aria-hidden />
        </div>
        <div className="flex flex-col items-start gap-1">
          <span className="text-label-md text-text-primary">{wallet.name}</span>
          {wallet.highlighted && <Chip tone="teal">Recommended</Chip>}
        </div>
      </div>
      <ChevronRight className="h-5 w-5 text-text-secondary transition-transform group-hover:translate-x-1" />
    </button>
  )
}

export function WalletPicker() {
  return (
    <Panel rounded="xl" className="w-full max-w-[480px] overflow-hidden">
      <div className="flex flex-col gap-stack-md p-stack-lg">
        <div className="text-center">
          <h1 className="mb-1 text-headline-md text-text-primary">Connect your wallet</h1>
          <p className="text-body-md text-text-secondary">Choose how to connect to Aura.</p>
        </div>
        <div className="mt-stack-md flex flex-col gap-stack-sm">
          {wallets.map(wallet => <WalletOption key={wallet.id} wallet={wallet} />)}
        </div>
        <div className="mt-stack-lg flex items-center justify-center gap-2 border-t border-glass-border pt-stack-md">
          <Lock className="h-4 w-4 text-aurora-teal" />
          <p className="text-label-sm text-text-secondary">
            Secure connection. We never ask for your private key.
          </p>
        </div>
      </div>
    </Panel>
  )
}
```

- [ ] **Step 2: Create `app/connect/page.tsx`**

```tsx
import { BrandingAnchor } from '@/components/layout/BrandingAnchor'
import { WalletPicker } from '@/components/connect/WalletPicker'

export const metadata = {
  title: 'Connect your wallet — Aura',
}

export default function ConnectPage() {
  return (
    <main className="flex min-h-screen items-center justify-center p-gutter">
      <WalletPicker />
      <BrandingAnchor />
    </main>
  )
}
```

- [ ] **Step 3: Run typecheck and lint**

```bash
npm run typecheck
npm run lint
```

Expected: pass.

- [ ] **Step 4: Visual smoke test**

```bash
npm run dev
```

Open `http://localhost:3000/connect` and confirm against `wireframe/aura_conectar_carteira/screen.png`:
- Centered glass card, ~480px wide.
- Header "Connect your wallet" + sub "Choose how to connect to Aura."
- WalletConnect row: violet-tinted background, Recommended chip.
- MetaMask, Coinbase Wallet, Rainbow rows below.
- Chevron icons translate right on hover.
- Footer: teal lock icon + "Secure connection. We never ask for your private key."
- "Aura Finance" anchor at the bottom of the page, low opacity.
- Click each wallet — confirm `console.info` fires with the wallet id.

Stop the dev server.

- [ ] **Step 5: Commit**

```bash
git add components/connect/WalletPicker.tsx app/connect/page.tsx
git commit -m "feat(connect): add WalletPicker and /connect route"
```

---

## Phase 6 — Dashboard

### Task 6.1: DashboardHeader

**Files:**
- Create: `components/dashboard/DashboardHeader.tsx`

- [ ] **Step 1: Create `components/dashboard/DashboardHeader.tsx`**

```tsx
import { BadgeCheck } from 'lucide-react'
import { truncateAddress } from '@/lib/format'
import type { WalletSession } from '@/lib/mock/types'

export function DashboardHeader({ wallet }: { wallet: WalletSession }) {
  return (
    <header className="mb-12 flex items-center justify-between">
      <div>
        <h1 className="text-headline-md text-text-primary">Hello 👋</h1>
        <p className="mt-1 text-body-md text-text-secondary">
          Welcome back to your Aura command center.
        </p>
      </div>
      <div className="flex items-center gap-3 rounded-lg border border-aurora-violet/30 bg-glass-fill px-4 py-2 backdrop-blur-glass">
        <BadgeCheck className="h-5 w-5 text-aurora-violet" />
        <span className="text-label-md text-text-primary">{truncateAddress(wallet.address)}</span>
      </div>
    </header>
  )
}
```

- [ ] **Step 2: Run typecheck and lint**

```bash
npm run typecheck
npm run lint
```

Expected: pass.

- [ ] **Step 3: Commit**

```bash
git add components/dashboard/DashboardHeader.tsx
git commit -m "feat(dashboard): add DashboardHeader"
```

---

### Task 6.2: ApprovalStepper

**Files:**
- Create: `components/dashboard/ApprovalStepper.tsx`

- [ ] **Step 1: Create `components/dashboard/ApprovalStepper.tsx`**

```tsx
import { Clock, Activity, FileCheck, CreditCard } from 'lucide-react'
import type { ReactNode } from 'react'
import { Panel } from '@/components/ui/Panel'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { StepDot } from '@/components/ui/StepDot'
import type { ApprovalProgress, ApprovalStep, StepStatus } from '@/lib/mock/types'

const stepIcons: Record<ApprovalStep['id'], ReactNode> = {
  wallet_connected: <Activity   className="h-5 w-5" />,
  asset_analysis:   <Activity   className="h-5 w-5" />,
  approval:         <FileCheck  className="h-5 w-5" />,
  card_issued:      <CreditCard className="h-5 w-5" />,
}

const captionColor: Record<StepStatus, string> = {
  completed:   'text-aurora-teal',
  in_progress: 'text-aurora-violet',
  pending:     'text-text-secondary',
}

export function ApprovalStepper({ progress }: { progress: ApprovalProgress }) {
  return (
    <Panel rounded="xl" className="relative mb-stack-lg overflow-hidden p-stack-lg">
      <div className="mb-8 flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <h2 className="text-headline-md font-bold text-text-primary">Approval status</h2>
        <div className="flex items-center gap-2 text-text-secondary">
          <Clock className="h-5 w-5" />
          <span className="text-label-md">{progress.etaLabel}</span>
        </div>
      </div>
      <div className="relative mb-8 grid grid-cols-1 gap-8 md:grid-cols-4">
        <div className="absolute left-0 top-6 -z-10 hidden h-px w-full bg-white/10 md:block" />
        {progress.steps.map(step => (
          <div
            key={step.id}
            className={`flex flex-col items-center text-center md:items-start md:text-left ${step.status === 'pending' ? 'opacity-40' : ''}`}
          >
            <div className="mb-4">
              <StepDot status={step.status} icon={stepIcons[step.id]} />
            </div>
            <p
              className={`text-label-md ${step.status === 'pending' ? 'text-text-secondary' : 'text-text-primary'}`}
            >
              {step.label}
            </p>
            <p className={`mt-1 text-label-sm ${captionColor[step.status]}`}>{step.caption}</p>
          </div>
        ))}
      </div>
      <ProgressBar percent={progress.percent} />
    </Panel>
  )
}
```

- [ ] **Step 2: Run typecheck and lint**

```bash
npm run typecheck
npm run lint
```

Expected: pass.

- [ ] **Step 3: Commit**

```bash
git add components/dashboard/ApprovalStepper.tsx
git commit -m "feat(dashboard): add ApprovalStepper"
```

---

### Task 6.3: EligibleBalancePanel

**Files:**
- Create: `components/dashboard/EligibleBalancePanel.tsx`

- [ ] **Step 1: Create `components/dashboard/EligibleBalancePanel.tsx`**

```tsx
import { Bitcoin, Hexagon, CircleDollarSign, Wallet } from 'lucide-react'
import type { ReactNode } from 'react'
import { Panel } from '@/components/ui/Panel'
import { IconBadge } from '@/components/ui/IconBadge'
import { formatUSD } from '@/lib/format'
import type { AssetBalance, AssetSymbol, EligibleBalance } from '@/lib/mock/types'

type AssetVisual = { icon: ReactNode; tone: 'orange' | 'blue' | 'teal' }

const assetVisual: Record<AssetSymbol, AssetVisual> = {
  BTC:  { icon: <Bitcoin           className="h-4 w-4" />, tone: 'orange' },
  ETH:  { icon: <Hexagon           className="h-4 w-4" />, tone: 'blue'   },
  USDC: { icon: <CircleDollarSign  className="h-4 w-4" />, tone: 'teal'   },
}

export function EligibleBalancePanel({ balance }: { balance: EligibleBalance }) {
  return (
    <Panel rounded="xl" className="flex flex-col justify-between p-stack-lg">
      <div>
        <div className="mb-6 flex items-start justify-between">
          <h3 className="text-label-md uppercase tracking-widest text-text-secondary">
            Eligible balance
          </h3>
          <Wallet className="h-5 w-5 text-aurora-teal" />
        </div>
        <p className="mb-8 text-[32px] font-bold text-text-primary md:text-[40px]">
          {formatUSD(balance.totalUsd)}
        </p>
      </div>
      <div className="space-y-4">
        {balance.assets.map((asset: AssetBalance) => {
          const visual = assetVisual[asset.symbol]
          return (
            <div key={asset.symbol} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <IconBadge icon={visual.icon} tone={visual.tone} size="sm" />
                <span className="text-label-md text-text-primary">{asset.name}</span>
              </div>
              <span className="text-label-md text-text-secondary">
                {asset.amountDisplay} {asset.symbol}
              </span>
            </div>
          )
        })}
      </div>
    </Panel>
  )
}
```

- [ ] **Step 2: Run typecheck and lint**

```bash
npm run typecheck
npm run lint
```

Expected: pass.

- [ ] **Step 3: Commit**

```bash
git add components/dashboard/EligibleBalancePanel.tsx
git commit -m "feat(dashboard): add EligibleBalancePanel"
```

---

### Task 6.4: EstimatedLimitPanel

**Files:**
- Create: `components/dashboard/EstimatedLimitPanel.tsx`

- [ ] **Step 1: Create `components/dashboard/EstimatedLimitPanel.tsx`**

```tsx
import { Panel } from '@/components/ui/Panel'
import { ProgressRing } from '@/components/ui/ProgressRing'
import { Chip } from '@/components/ui/Chip'
import { formatCompactUSD } from '@/lib/format'
import type { EstimatedLimit } from '@/lib/mock/types'

export function EstimatedLimitPanel({ limit }: { limit: EstimatedLimit }) {
  return (
    <Panel rounded="xl" className="flex flex-col items-center justify-center p-stack-lg text-center">
      <h3 className="mb-6 self-start text-label-md uppercase tracking-widest text-text-secondary">
        Estimated limit
      </h3>
      <div className="mb-6">
        <ProgressRing
          percent={limit.utilizationPercent}
          label={formatCompactUSD(limit.limitUsd)}
          caption="Available"
        />
      </div>
      <Chip tone="teal">
        <span className="h-2 w-2 rounded-full bg-aurora-teal" />
        {limit.utilizationCaption}
      </Chip>
    </Panel>
  )
}
```

- [ ] **Step 2: Run typecheck and lint**

```bash
npm run typecheck
npm run lint
```

Expected: pass.

- [ ] **Step 3: Commit**

```bash
git add components/dashboard/EstimatedLimitPanel.tsx
git commit -m "feat(dashboard): add EstimatedLimitPanel"
```

---

### Task 6.5: ActivityTimeline

**Files:**
- Create: `components/dashboard/ActivityTimeline.tsx`

- [ ] **Step 1: Create `components/dashboard/ActivityTimeline.tsx`**

```tsx
import { Check, RefreshCw, Lock } from 'lucide-react'
import type { ReactNode } from 'react'
import { Panel } from '@/components/ui/Panel'
import type { TimelineEvent, TimelineEventStatus } from '@/lib/mock/types'

const statusIcon: Record<TimelineEventStatus, ReactNode> = {
  completed:   <Check     className="h-4 w-4 text-aurora-teal" />,
  in_progress: <RefreshCw className="h-4 w-4 text-aurora-violet pulse-accent" />,
  pending:     <Lock      className="h-4 w-4 text-text-secondary" />,
}

const ringColor: Record<TimelineEventStatus, string> = {
  completed:   'border-aurora-teal',
  in_progress: 'border-aurora-violet',
  pending:     'border-white/20',
}

export function ActivityTimeline({ events }: { events: TimelineEvent[] }) {
  return (
    <Panel rounded="xl" className="p-stack-lg">
      <h3 className="mb-8 text-headline-md font-bold text-text-primary">Analysis events</h3>
      <div className="relative space-y-8 before:absolute before:inset-0 before:ml-5 before:h-full before:w-0.5 before:-translate-x-px before:bg-gradient-to-b before:from-aurora-violet before:to-transparent">
        {events.map(event => (
          <div
            key={event.id}
            className={`group relative flex items-center justify-between gap-4 pl-12 ${event.status === 'pending' ? 'opacity-50' : ''}`}
          >
            <div
              className={`absolute left-0 flex h-10 w-10 items-center justify-center rounded-full border-2 bg-background transition-transform group-hover:scale-110 ${ringColor[event.status]}`}
            >
              {statusIcon[event.status]}
            </div>
            <div>
              <p
                className={`text-label-md ${event.status === 'pending' ? 'text-text-secondary' : 'text-text-primary'}`}
              >
                {event.title}
              </p>
              <p className="text-label-sm text-text-secondary">{event.description}</p>
            </div>
            <time className="text-label-sm text-text-secondary">{event.timestamp}</time>
          </div>
        ))}
      </div>
    </Panel>
  )
}
```

- [ ] **Step 2: Run typecheck and lint**

```bash
npm run typecheck
npm run lint
```

Expected: pass.

- [ ] **Step 3: Commit**

```bash
git add components/dashboard/ActivityTimeline.tsx
git commit -m "feat(dashboard): add ActivityTimeline"
```

---

### Task 6.6: Compose dashboard page

**Files:**
- Create: `app/dashboard/page.tsx`

- [ ] **Step 1: Create `app/dashboard/page.tsx`**

```tsx
'use client'

import { Sidebar } from '@/components/layout/Sidebar'
import { MobileTabBar } from '@/components/layout/MobileTabBar'
import { DashboardHeader } from '@/components/dashboard/DashboardHeader'
import { ApprovalStepper } from '@/components/dashboard/ApprovalStepper'
import { EligibleBalancePanel } from '@/components/dashboard/EligibleBalancePanel'
import { EstimatedLimitPanel } from '@/components/dashboard/EstimatedLimitPanel'
import { ActivityTimeline } from '@/components/dashboard/ActivityTimeline'
import { useDashboardMock } from '@/lib/mock/hooks'

export default function DashboardPage() {
  const data = useDashboardMock()
  return (
    <div className="flex min-h-screen">
      <Sidebar wallet={data.wallet} />
      <main className="mx-auto w-full max-w-container-max flex-grow px-gutter py-stack-lg lg:ml-64 lg:px-margin-desktop">
        <DashboardHeader wallet={data.wallet} />
        <ApprovalStepper progress={data.progress} />
        <div className="mb-stack-lg grid grid-cols-1 gap-stack-lg md:grid-cols-2">
          <EligibleBalancePanel balance={data.balance} />
          <EstimatedLimitPanel  limit={data.limit} />
        </div>
        <ActivityTimeline events={data.timeline} />
      </main>
      <MobileTabBar />
    </div>
  )
}
```

- [ ] **Step 2: Run typecheck and lint**

```bash
npm run typecheck
npm run lint
```

Expected: pass.

- [ ] **Step 3: Visual smoke test**

```bash
npm run dev
```

Open `http://localhost:3000/dashboard` and confirm against `wireframe/aura_dashboard_de_libera_o/screen.png`:
- **Sidebar** (≥1024px): logo at top, Overview highlighted, Card/Wallet/Settings below, wallet pill at the bottom showing `0x71C0…4f31` with a teal dot and copy icon.
- **Header**: "Hello 👋" + welcome subtitle on the left; verified pill with the address on the right.
- **ApprovalStepper**: "Approval status" + "Estimated completion: ~2h"; 4 steps where step 1 is a gradient circle with check, step 2 is a violet pulsing circle, steps 3-4 are dimmed; gradient progress bar at 45%.
- **EligibleBalancePanel**: "ELIGIBLE BALANCE" label, "$28,500" value, three asset rows (BTC 0.45 BTC, ETH 12.8 ETH, USDC 5,000 USDC).
- **EstimatedLimitPanel**: progress ring with "$9k Available", chip "70% ideal utilization rate".
- **ActivityTimeline**: vertical gradient rule, three events (completed → in progress → pending) with appropriate icons and timestamps.
- Resize to ~390px: sidebar hides, MobileTabBar appears at the bottom, stats grid stacks vertically.

Stop the dev server.

- [ ] **Step 4: Commit**

```bash
git add app/dashboard/page.tsx
git commit -m "feat(dashboard): compose dashboard page with mocked data"
```

---

## Phase 7 — Definition of Done

### Task 7.1: Full DoD sweep

- [ ] **Step 1: Confirm `.claude/hooks/block-unsafe-web3.sh` is untouched**

```bash
git log -- .claude/hooks/block-unsafe-web3.sh
git status .claude/hooks/block-unsafe-web3.sh
```

Expected: no commits modifying the hook; `git status` shows nothing.

- [ ] **Step 2: Confirm no raw hex outside config/CSS**

PowerShell (project root):
```powershell
Get-ChildItem -Recurse -Include *.ts,*.tsx -Path app,components,lib |
  Select-String -Pattern '#[0-9a-fA-F]{6}' |
  Where-Object { $_.Line -notmatch 'logo.svg' }
```

Or bash with rg:
```bash
rg "#[0-9a-fA-F]{6}" app components lib --type ts --type tsx
```

Expected: no results (or only whitelisted SVG-embedded colors inside string literals for the wallet logos, which all live in `public/`). If any hex appears in `components/**`, replace it with the matching Tailwind token before continuing.

- [ ] **Step 3: Confirm no component imports from `lib/mock/**`**

```bash
rg "from '@/lib/mock" components
```

Expected: no matches.

- [ ] **Step 4: Run the full DoD command set**

```bash
npm run typecheck
npm run lint
npm run build
npm test
```

Expected: all pass. The `next build` output lists `/`, `/connect`, `/dashboard` as routes.

- [ ] **Step 5: Final manual smoke test in dev**

```bash
npm run dev
```

Walk through:
- `/` → click "Connect wallet" → lands on `/connect`.
- `/connect` → click a wallet → console logs `mock connect: <id>` (no navigation).
- Manually visit `/dashboard` → all sections render with the mocked data.
- Test viewport widths 1440px and 390px on each route.

Stop the dev server.

- [ ] **Step 6: Final commit if anything drifted**

```bash
git status
```

If clean, you're done. Otherwise stage and commit with `chore: finalize sprint 0+1 dod sweep`.

---

## Spec coverage check

| Spec section / requirement                                | Covered by task(s)        |
|-----------------------------------------------------------|---------------------------|
| §1 English UI, non-custodial constraints                  | enforced across all tasks; security hook check in 7.1 |
| §2 Project layout                                         | Tasks 0.1–0.6 + every component task that creates a file in its declared path |
| §3 Design tokens in `tailwind.config.ts`                  | Task 0.3                  |
| §3 `globals.css` helpers + animations                     | Task 0.4                  |
| §3 Inter via `next/font/google`                           | Task 0.4                  |
| §3 Logo placeholder                                       | Task 0.5                  |
| §4.1 Mock types                                           | Task 0.6 (declared) — used in 2.1 onward |
| §4.2 Frozen mock data                                     | Task 2.1                  |
| §4.3 Mock hooks                                           | Task 2.1                  |
| §4.4 Format helpers                                       | Task 0.6                  |
| §5.1 UI primitives                                        | Tasks 1.1–1.5             |
| §5.2 Layout components                                    | Tasks 0.5 (AuroraBackground), 3.1, 3.2 |
| §5.3 Landing sections                                     | Tasks 4.2, 4.3, 4.4       |
| §5.4 CardVisualizer                                       | Task 4.1                  |
| §5.5 Connect screen + WalletPicker                        | Tasks 5.1, 5.2            |
| §5.6 Dashboard components + composition                   | Tasks 6.1–6.6             |
| §6 Routing                                                | Tasks 4.4, 5.2, 6.6       |
| §7 Definition of done                                     | Task 7.1                  |
| §8 Out-of-scope items                                     | No tasks create them — verified by absence in 7.1 |
