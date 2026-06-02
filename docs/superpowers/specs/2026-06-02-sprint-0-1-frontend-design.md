# Sprint 0 + Sprint 1 — Frontend foundation & mocked screens

**Date:** 2026-06-02
**Scope:** Sprint 0 (project scaffold + design tokens) and Sprint 1 (landing,
connect-wallet, dashboard) with mocked data only. No wallet connection, no
SIWE, no on-chain calls, no contracts — those belong to Sprint 2+.
**Author:** Brainstorming session, approved by product owner.

---

## 1. Goals & constraints

### Goals

1. Stand up a Next.js (App Router) + TypeScript + Tailwind workspace whose
   directory layout matches `CLAUDE.md` and whose Tailwind config centralizes
   every visual token defined in `wireframe/aura_finance/DESIGN.md`.
2. Ship three pixel-faithful screens against a mock data layer:
   - `/` — landing / offer page
   - `/connect` — wallet picker (static UI; no real connection)
   - `/dashboard` — approval status with stepper, eligible balance,
     estimated limit, activity timeline.
3. Make `npm run dev`, `build`, `lint`, `typecheck`, `test` all pass.

### Hard constraints (from `CLAUDE.md` and `.claude/rules/`)

- **Non-custodial.** No private-key handling. No transaction prompts in Sprint 1.
- **English-only UI.** Wireframe copy is in Portuguese; everything in
  `app/` and `components/` is translated to English.
- **No scattered hex.** Every color/radius/spacing token lives in
  `tailwind.config.ts` only.
- **Strict TypeScript.** No unexplained `any`.
- **Web3 layout reserved.** `lib/web3/` exists empty; pulling Sprint 2+ work
  forward is forbidden.
- **Security hook stays on.** `.claude/hooks/block-unsafe-web3.sh` must not
  be modified or bypassed.

### Product decisions resolved during brainstorming

| Question | Decision |
|---|---|
| Currency for mocked numbers | **USD** ($) — global default, matches the English UI. |
| Icon library | **lucide-react** — tree-shaken SVGs, no CDN font. |
| Mock states | **Single frozen state**: wallet connected, asset analysis in progress, approval + card pending, 45% progress. |
| Product name | **Aura / Aura Card / Aura Finance** — bake into copy and page titles. |

---

## 2. Project structure

```
cripto card/
├── app/
│   ├── layout.tsx              # root layout: <html lang="en">, Inter font, AuroraBackground
│   ├── globals.css             # Tailwind directives + .glass-panel/.text-aurora helpers
│   ├── page.tsx                # "/" landing
│   ├── connect/
│   │   └── page.tsx            # "/connect" wallet-picker screen
│   └── dashboard/
│       └── page.tsx            # "/dashboard" approval status
├── components/
│   ├── layout/
│   │   ├── TopNav.tsx
│   │   ├── Sidebar.tsx
│   │   ├── MobileTabBar.tsx
│   │   ├── Footer.tsx
│   │   ├── BrandingAnchor.tsx
│   │   └── AuroraBackground.tsx
│   ├── ui/
│   │   ├── Panel.tsx           # glassmorphism panel (skill: glass-panel)
│   │   ├── GradientButton.tsx
│   │   ├── GhostButton.tsx
│   │   ├── Chip.tsx
│   │   ├── IconBadge.tsx
│   │   ├── ProgressBar.tsx
│   │   ├── ProgressRing.tsx
│   │   └── StepDot.tsx
│   ├── landing/
│   │   ├── Hero.tsx
│   │   ├── BenefitsGrid.tsx
│   │   ├── HowItWorks.tsx
│   │   └── ClosingCTA.tsx
│   ├── card/
│   │   └── CardVisualizer.tsx
│   ├── connect/
│   │   └── WalletPicker.tsx    # contains internal WalletOption
│   └── dashboard/
│       ├── DashboardHeader.tsx
│       ├── ApprovalStepper.tsx
│       ├── EligibleBalancePanel.tsx
│       ├── EstimatedLimitPanel.tsx
│       └── ActivityTimeline.tsx
├── lib/
│   ├── web3/                   # empty; .gitkeep only
│   ├── mock/
│   │   ├── types.ts
│   │   ├── data.ts
│   │   └── hooks.ts
│   └── format.ts
├── public/
│   └── wallets/                # walletconnect.svg, metamask.svg, coinbase.svg, rainbow.svg
├── docs/
│   └── superpowers/specs/      # this document lives here
├── wireframe/                  # untouched; design source of truth
├── .claude/                    # untouched
├── CLAUDE.md                   # untouched
├── tailwind.config.ts
├── postcss.config.mjs
├── next.config.ts
├── tsconfig.json               # "strict": true
├── .eslintrc.json              # next/core-web-vitals
├── .gitignore
└── package.json
```

### Architectural rules

- **Components are presentational.** No `lib/mock/*` imports inside
  `components/**`. Pages (`app/**/page.tsx`) call the mock hooks and pass
  data down as props.
- **One source for visual tokens.** Colors, radii, spacing, gradient, blur
  values exist only in `tailwind.config.ts`. Two helper utilities live in
  `globals.css`: `.glass-panel` and `.text-aurora`.
- **`lib/web3/` is reserved.** Empty namespace with `.gitkeep`; first write
  happens in Sprint 2 (Reown AppKit + wagmi + viem + SIWE).

---

## 3. Design tokens — `tailwind.config.ts`

```ts
// shape (final file written during implementation)
theme: {
  extend: {
    colors: {
      background:    '#0B0B10',
      surface:       '#131318',
      'surface-low': '#1B1B20',
      'surface-mid': '#1F1F24',
      'text-primary':   '#F7F9FA',
      'text-secondary': '#A0A9BE',
      'aurora-violet': '#7C5CFF',
      'aurora-blue':   '#4F8CFF',
      'aurora-teal':   '#2DD4BF',
      'glass-fill':   'rgba(255,255,255,0.07)',
      'glass-border': 'rgba(255,255,255,0.12)',
    },
    fontFamily: { sans: ['var(--font-inter)', 'system-ui', 'sans-serif'] },
    fontSize: {
      'display-lg':  ['64px', { lineHeight:'1.1', letterSpacing:'-0.04em', fontWeight:'600' }],
      'headline-lg': ['40px', { lineHeight:'1.2', letterSpacing:'-0.03em', fontWeight:'600' }],
      'headline-md': ['24px', { lineHeight:'1.3', letterSpacing:'-0.01em', fontWeight:'500' }],
      'body-lg':     ['18px', { lineHeight:'1.6', fontWeight:'400' }],
      'body-md':     ['16px', { lineHeight:'1.6', fontWeight:'400' }],
      'label-md':    ['14px', { lineHeight:'1.4', letterSpacing:'0.02em', fontWeight:'500' }],
      'label-sm':    ['12px', { lineHeight:'1.2', letterSpacing:'0.05em', fontWeight:'600' }],
    },
    borderRadius: { sm:'0.25rem', DEFAULT:'0.5rem', md:'0.75rem', lg:'1rem', xl:'1.5rem' },
    spacing: {
      gutter:'24px', 'stack-sm':'8px', 'stack-md':'16px', 'stack-lg':'32px',
      'margin-mobile':'20px', 'margin-desktop':'40px',
    },
    maxWidth:        { 'container-max': '1280px' },
    backgroundImage: { 'aurora-gradient': 'linear-gradient(135deg,#7C5CFF 0%,#4F8CFF 50%,#2DD4BF 100%)' },
    backdropBlur:    { glass: '20px' },
    boxShadow:       { 'glow-violet': '0 0 20px rgba(124,92,255,0.4)' },
  },
}
```

`globals.css` adds (only) two helpers and the `pulse-accent` keyframes used
by the in-progress step indicator. Inter is loaded via `next/font/google` so
the build is self-contained (no CDN font, no FOUT).

**Logo placeholder.** Until a real brand asset is provided, the wordmark is
typographic — uppercase "Aura" in Inter at `font-weight: 700`, plus a small
square mark generated as an inline SVG (the letter "A" set against the
aurora gradient). Lives at `public/logo.svg` and is consumed by `TopNav`,
`Sidebar`, `Footer`, `BrandingAnchor`, and `CardVisualizer`. No remote image
hotlinks.

---

## 4. Mock data layer

### 4.1 Types — `lib/mock/types.ts`

All on-chain raw amounts are `bigint`. USD values are `number` (display-only).
Addresses are 0x-prefixed checksummed strings.

```ts
export type Address = `0x${string}`
export type AssetSymbol = 'BTC' | 'ETH' | 'USDC'

export interface AssetBalance {
  symbol: AssetSymbol
  name: string
  amountRaw: bigint        // raw on-chain units (sats / wei / 6dp)
  decimals: number
  amountDisplay: string    // pre-formatted; components never recompute
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
  percent: number          // 0..100
  etaLabel: string         // "Estimated completion: ~2h"
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
  timestamp: string        // "10:42 AM" / "Now" / "—"
}

export interface WalletSession {
  address: Address
  addressShort: string     // "0x71C0…4f31"
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

### 4.2 Frozen mock — `lib/mock/data.ts`

A single object tree, matching the wireframe's frozen moment:

- Wallet: full address `0x71C0000000000000000000000000000000004f31`
  (display short form `0x71C0…4f31`) on Ethereum mainnet (chainId 1).
- Progress: step 1 completed, step 2 in progress, steps 3-4 pending; 45%; ETA "~2h".
- Balance: $28,500 total — 0.45 BTC ($18,900), 12.8 ETH ($4,600), 5,000 USDC ($5,000).
- Limit: $9,000 with 70% ideal utilization caption.
- Timeline: liquidity verification completed (10:42 AM), credit score in progress (Now), key generation pending (—).

### 4.3 Hooks — `lib/mock/hooks.ts`

```ts
'use client'
export function useDashboardMock(): DashboardData { return MOCK_DASHBOARD }
export function useWalletMock():   WalletSession   { return MOCK_WALLET }
```

The hook signatures are what Sprint 3 reimplements with real RPC reads.
Components do not change.

### 4.4 Format helpers — `lib/format.ts`

```ts
formatUSD(n)         // Intl.NumberFormat en-US currency, 0 fraction digits → "$28,500"
formatCompactUSD(n)  // compact notation → "$9k"
truncateAddress(a)   // "0x71C0…4f31"
```

Bigint-aware token formatting is deferred to Sprint 3 — for Sprint 1 the
mock supplies `amountDisplay` strings so we don't paint a half-built helper.

---

## 5. Component inventory

### 5.1 Primitives — `components/ui/`

| Component | Props (essentials) | Renders |
|---|---|---|
| `Panel` | `children`, `className?`, `as?` | glassmorphism container per the `glass-panel` skill. |
| `GradientButton` | `children`, `onClick?`, `href?`, `size?`, `icon?`, `iconPosition?` | `<a>` if `href`, else `<button>`; `bg-aurora-gradient`, white text, `rounded-xl`. |
| `GhostButton` | same contract as `GradientButton` | glass-fill secondary CTA. |
| `Chip` | `children`, `tone` | small badge: `tone/20` background + `tone` text. |
| `IconBadge` | `icon`, `tone` | 48px rounded square: `tone/20` fill + `tone` icon. |
| `ProgressBar` | `percent` | 6px horizontal bar; `white/10` track, `aurora-gradient` fill. |
| `ProgressRing` | `percent`, `label`, `caption` | 192px SVG ring (stroke `aurora-teal`) with centered label/caption. |
| `StepDot` | `index`, `status` | 48px circle: completed = gradient fill + check; in_progress = violet border + icon + `pulse-accent`; pending = `white/10` + dim icon. |

### 5.2 Layout — `components/layout/`

| Component | Used by | Notes |
|---|---|---|
| `AuroraBackground` | root layout | fixed, `aria-hidden`; two blurred radial blobs (violet top-left, teal bottom-right). |
| `TopNav` | landing | sticky glass nav with logo, anchor links, and a `GradientButton` linking to `/connect`. |
| `Footer` | landing | logo, link row, copyright; top border in `glass-border`. |
| `Sidebar` | dashboard (`≥ lg`) | fixed 256px column; logo, nav items (Overview/Card/Wallet/Settings), wallet pill in the footer. |
| `MobileTabBar` | dashboard (`< lg`) | bottom bar with 4 icons. |
| `BrandingAnchor` | connect page | low-opacity "Aura Finance" centered at the bottom. |

### 5.3 Landing — `components/landing/`

```tsx
// app/page.tsx
<TopNav />
<main className="mx-auto max-w-container-max px-gutter md:px-margin-desktop">
  <Hero />
  <BenefitsGrid />
  <HowItWorks />
  <ClosingCTA />
</main>
<Footer />
```

| Component | UI copy (English) |
|---|---|
| `Hero` | H1 "Your on-chain wealth, now in the real world." · sub "The first luxury credit card backed by your crypto. No bureaucracy, instant approval." · `GradientButton` "Connect wallet" → `/connect` · `GhostButton` "View benefits" · right column: `CardVisualizer`. |
| `BenefitsGrid` | 3× `Panel` with `IconBadge`: **No bank** (violet) · **Crypto-backed** (teal) · **On-chain approval** (blue), each with a one-line explainer. |
| `HowItWorks` | 3 numbered columns connected by a decorative rule: *Connect your wallet · We analyze your assets · Receive your card*. |
| `ClosingCTA` | Large `Panel`: H2 "Ready to raise your financial standard?" + `GradientButton` "Request my Aura Card". |

### 5.4 Card visualizer — `components/card/CardVisualizer.tsx`

Glass panel with aspect `1.58 / 1`. Top row: "AURA ELITE" label + gold chip;
right: Aura mark. Card number "•••• •••• •••• 8821" in a wide-tracking
display. Bottom row: "CARD HOLDER" label + "GENESIS MEMBER" + two
circle-overlap glyphs (red / orange, `mix-blend-screen`) standing in for a
brand mark. Includes the `shimmer` keyframe and a mousemove tilt
(`perspective(1000px) rotateX/Y`).

### 5.5 Connect screen

```tsx
// app/connect/page.tsx
<main className="flex min-h-screen items-center justify-center p-gutter">
  <WalletPicker />
  <BrandingAnchor />
</main>
```

`WalletPicker` is a `Panel` (`max-w-[480px]`):

- Header: H1 "Connect your wallet" + sub "Choose how to connect to Aura."
- Body: four `WalletOption` rows.
  - **WalletConnect** — highlighted with `aurora-violet/10` background and
    `Chip` label "Recommended".
  - **MetaMask** — `#F6851B/20` ring.
  - **Coinbase Wallet** — `#0052FF/20` ring.
  - **Rainbow** — gradient `#001AFF → #00E0FF` ring.
- Footer: lock icon (teal) + "Secure connection. We never ask for your
  private key." (satisfies `security.md`).
- Wallet icons: local SVGs in `public/wallets/`.
- `onClick` is a no-op (`console.info('mock connect:', id)`); no real wallet
  logic in Sprint 1.

### 5.6 Dashboard

```tsx
// app/dashboard/page.tsx
const data = useDashboardMock()
<div className="flex min-h-screen">
  <Sidebar wallet={data.wallet} />
  <main className="flex-grow lg:ml-64 px-gutter lg:px-margin-desktop py-stack-lg w-full max-w-container-max mx-auto">
    <DashboardHeader wallet={data.wallet} />
    <ApprovalStepper progress={data.progress} />
    <div className="grid grid-cols-1 md:grid-cols-2 gap-stack-lg mb-stack-lg">
      <EligibleBalancePanel balance={data.balance} />
      <EstimatedLimitPanel  limit={data.limit} />
    </div>
    <ActivityTimeline events={data.timeline} />
  </main>
  <MobileTabBar />
</div>
```

| Component | Props | Renders |
|---|---|---|
| `DashboardHeader` | `wallet` | "Hello 👋" + "Welcome back to your Aura command center." + verified-icon pill with truncated address. |
| `ApprovalStepper` | `progress` | `Panel`. "Approval status" + ETA. Grid of 4 `StepDot` columns (icon + label + caption). `ProgressBar` underneath. |
| `EligibleBalancePanel` | `balance` | `Panel`. Label "ELIGIBLE BALANCE" + `formatUSD(totalUsd)` in display-lg. Asset rows: `IconBadge` (tone per asset) + name + `amountDisplay`. |
| `EstimatedLimitPanel` | `limit` | `Panel`. Label "ESTIMATED LIMIT" + `ProgressRing` (label = `formatCompactUSD(limitUsd)`, caption "Available") + `Chip` with `utilizationCaption`. |
| `ActivityTimeline` | `events` | `Panel`. Title "Analysis events". Vertical list with `aurora-violet → transparent` rule; each row: status-colored icon ring + title + description + timestamp. |

---

## 6. Routing

- `/` → landing
- `/connect` → wallet picker
- `/dashboard` → mocked dashboard

No middleware, no route protection in Sprint 1. Real auth lands in Sprint 2
with SIWE.

---

## 7. Definition of done

| Check | Pass criteria |
|---|---|
| Dev server | `npm run dev` boots; all three routes render without console errors. |
| Production build | `npm run build` completes with no warnings. |
| Lint | `npm run lint` clean (`next/core-web-vitals` + `@typescript-eslint`). |
| Type-check | `npm run typecheck` (`tsc --noEmit`) clean. No undocumented `any`. |
| Tests | `npm test` runs Vitest. Suite is empty in Sprint 1; non-empty starting Sprint 3 (Web3 hooks). |
| Security hook | `.claude/hooks/block-unsafe-web3.sh` is untouched and still wired in `settings.json`. |
| Visual fidelity | Manual smoke check at 1440px and 390px viewports; layout, spacing, and glass effects match the wireframe HTMLs. |
| Tokens | No raw hex (`#xxxxxx`) outside `tailwind.config.ts` or `globals.css`. |
| Mock isolation | No file under `components/**` imports from `lib/mock/**`. |

---

## 8. Out of scope (explicit)

These are Sprint 2+ and **must not** be introduced now:

- Reown AppKit / wagmi / viem wiring; any `useAccount`-style hook.
- SIWE message construction, nonce endpoint, session cookie.
- Any on-chain RPC read, even a stub.
- Solidity contracts, deployment scripts, ABIs.
- Admin panel routes.
- Postgres / Prisma schema; KYC.
- Real wallet logos fetched from CDN; we ship local SVGs.
- Skeleton/loading states inside components (mock is synchronous).
