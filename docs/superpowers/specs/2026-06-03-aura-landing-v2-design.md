# AuraCard Landing v2 — Design Spec

Date: 2026-06-03
Status: Approved (pending written-spec review)

## Goal

Rebuild the AuraCard marketing landing page so it is **visually identical** to the
reference project `twspendcard.fi` (provided as a built render in `layout/`) —
same colors, structure, fonts, spacing, and animations — while replacing all
Trust Wallet branding and fabricated trust signals with the AuraCard brand and
truthful/illustrative content.

The new landing **replaces** the current home at `/` (option A). The previous
landing components are removed from the route (kept in repo history).

## Hard boundaries (non-negotiable)

The reference must NOT be reproduced verbatim where it impersonates a real company
or fabricates regulatory/financial trust signals:

1. No Trust Wallet logo/name/"Trust Card" wordmarks → use **AuraCard** brand.
2. No fabricated regulatory licenses (FINTRAC M22847361, FCA FRN 926481, DNB EMI,
   SFC SVF0058, etc.) → illustrative/neutral content, no invented IDs.
3. No real VC backer logos (a16z, Sequoia, Paradigm, Pantera, Blockchain Capital)
   → neutral "Regulated partners"-style content, no third-party marks.

Third-party **wallet** logos (MetaMask, Coinbase, Phantom, Ledger, Exodus, etc.)
and Apple Pay / Google Pay are kept — showing "works with" integrations is
legitimate, not impersonation.

## Theme architecture (the delicate part)

The app is currently **dark globally**: `app/layout.tsx` sets `className="...dark"`
plus `<AuroraBackground/>`, and `tailwind.config.ts` defines colors as fixed hex
(`background: '#0B0B10'`). The reference is a **light** theme using the
`hsl(var(--token))` pattern.

Approach — bring in the reference token system without breaking the dark app
(dashboard, connect, etc.):

- Convert the semantic Tailwind color tokens to `hsl(var(--x))` form:
  `background`, `foreground`, `card`, `card-foreground`, `popover`,
  `popover-foreground`, `primary`, `primary-foreground`, `primary-light`,
  `primary-dark`, `secondary`, `secondary-foreground`, `muted`,
  `muted-foreground`, `accent`, `accent-foreground`, `border`, `input`, `ring`,
  `success`, `destructive`.
- Define **default** values for these CSS vars (in `:root`/`.dark` in
  `globals.css`) that match the **current dark theme exactly** (e.g.
  `--background` = HSL of `#0B0B10`, `--foreground` = HSL of `#F7F9FA`). Existing
  screens render identically — no visual regression.
- Existing custom tokens (`surface`, `text-primary`, `text-secondary`, `aurora-*`,
  `glass-*`, etc.) are left untouched. Only `background` migrates from hex to
  `hsl(var(--background))` with a matching default, so existing `bg-background`
  usages are unaffected.
- The new landing lives in a **route group** `app/(marketing-v2)/` whose layout
  applies a wrapper class (e.g. `theme-aura-light`) that overrides the CSS vars
  with the reference's **light blue** values:
  - `--background: 0 0% 98%`, `--foreground: 230 25% 10%`
  - `--card: 0 0% 100%`, `--card-foreground: 230 25% 10%`
  - `--primary: 241 100% 50%`, `--primary-foreground: 0 0% 100%`
  - `--primary-light: 240 100% 60%`, `--primary-dark: 241 100% 40%`
  - `--secondary: 240 20% 96%`, `--muted: 240 10% 92%`,
    `--muted-foreground: 230 10% 46%`
  - `--accent: 241 100% 50%`, `--border: 240 10% 90%`, `--ring: 241 100% 50%`
  - `--success: 160 84% 39%`, `--radius: .75rem`
  - shadows: `--shadow-card: 0 25px 60px -12px hsl(241 100% 50% / .25)`,
    `--shadow-button: 0 4px 14px 0 hsl(241 100% 50% / .39)`
  - gradients: `--gradient-primary`, `--gradient-card`, `--gradient-card-metal`
    (copied 1:1 from reference)
- The marketing-v2 layout does **not** render `AuroraBackground` and does **not**
  carry the `dark` class; it sets `theme-aura-light` so the page is pure light.

This isolates the light theme to the landing route while reproducing the
reference tokens 1:1. App routes (dashboard/connect) stay dark and unchanged.

## Typography

Reference uses **Geist** (`layout/fonts/geist.woff2` already in repo). Load via
`next/font/local`, scoped to the marketing-v2 layout via a CSS variable
(`--font-geist`). The rest of the app keeps Inter. The Tailwind `sans` stack used
inside the landing resolves to Geist.

## Assets

Copy into `public/`:
- `layout/assets/hero-wallet-*.avif` → `public/marketing/hero-wallet.avif`
- `layout/assets/metal-card-*.png` → `public/marketing/metal-card.png`
- `layout/trust-assets/wallets/*` → `public/marketing/wallets/` (wallet + Apple/
  Google Pay logos)
- `layout/trust-assets/crypto/*` → `public/marketing/crypto/` (tron, ethereum,
  bsc, polygon)
- AuraCard logo replaces `trust-wallet-logo.png` / `trust-logo-name.png` in
  header/footer (reuse existing AuraCard brand asset; if none, a text wordmark).
- Backer SVGs are NOT copied (boundary #3).

## Component breakdown

New presentational components in `components/marketing-v2/`, each mirroring one
section of the reference HTML (classes, spacing, animations preserved):

| Component | Mirrors | Notes |
|---|---|---|
| `SiteHeaderV2` | sticky header | AuraCard logo, nav (Features/Rewards/Premium/FAQ), language chip (static), "Get Started" → `/connect` |
| `HeroV2` | hero section | badge, h1 "Spend Crypto Like Cash. Everywhere.", subcopy, "Issue Card" → `/connect` + "Learn More" anchor, trust ticks (No KYC / Instant Approval / Zero Annual Fee), hero image, gradient orbs + dot grid |
| `WalletMarquee` | Apple/Google Pay + infinite wallet marquee | kept integral |
| `BackersStrip` | "Our Backers" grid | relabeled neutral content, no VC marks |
| `FeaturesGrid` | 6 feature cards | Lucide icons, glass cards, hover translate |
| `RewardsSection` | cashback bars + crypto grid | "5% Max" center badge, progress bars |
| `PremiumCardSection` | metal card block | perks grid, "Check Eligibility" → `/connect`, metal-card image |
| `ClosingCtaV2` | final CTA | "Issue Card — It's Free" → `/connect`, neutral chips |
| `SiteFooterV2` | footer | product/legal/support link columns, "Licensed Card Issuer" cards (illustrative, no fake IDs), compliance badge row (generic), copyright + disclaimer |
| `ScrollToTop` | floating button | client component, appears on scroll |

Content/copy lives in a small data module (`components/marketing-v2/content.ts`)
so text is centralized and easy to edit. Components stay presentational.

Existing legal pages (`/faq`, `/privacy`, `/terms`, `/security`, `/support`) are
linked from header/footer and left as-is.

## Button wiring

All primary CTAs route to the existing connect flow:
- "Get Started", "Issue Card", "Issue Card — It's Free", "Check Eligibility"
  → `Link href="/connect"` (which already redirects to `/dashboard` after SIWE).
- Header nav + "Learn More" → in-page anchors (`#features`, `#rewards`,
  `#premium`), matching reference.
- No new Web3 logic; reuses the existing connect → dashboard → CardRequestModal
  pipeline. Security rules untouched (read-only, bounded approvals).

## Animations

Ported as keyframes in `globals.css` / Tailwind config:
- `fade-in-up` + delay variants (`-delay-1/2/3`) — hero entrance
- `marquee` — infinite horizontal scroll for wallet logos
- `gradient-orb` — soft blurred radial accents
- hover `-translate-y` transitions on cards/buttons

## Files touched

- `app/page.tsx` is **moved** to `app/(marketing-v2)/page.tsx` (route groups don't
  affect the URL, so it still serves `/`) and rewritten to render the new landing.
- `app/(marketing-v2)/layout.tsx` → new route-group layout (light theme via
  `theme-aura-light`, Geist font, no `AuroraBackground`). Only the home route lives
  in this group, so the light theme can't leak into app routes.
- `tailwind.config.ts` → semantic tokens migrate to `hsl(var(--x))`; add keyframes.
- `app/globals.css` → default (dark) token vars + `.theme-aura-light` overrides +
  keyframes.
- `components/marketing-v2/*` → new components + `content.ts`.
- `public/marketing/*` → copied assets.
- Old `components/landing/*` left in repo but no longer imported by `/`.

## Definition of done

- `npm run typecheck` clean, `npm run lint` clean.
- `npm run build` succeeds.
- Existing dashboard/connect screens visually unchanged (dark theme intact).
- New landing matches reference layout/colors/fonts/animations, with AuraCard
  brand and no impersonation/fabricated trust signals.
- No security-rule violation (no new approvals/transactions; CTAs only navigate).

## Out of scope

- No changes to Web3 hooks, vault config, or auth.
- No new backend/persistence.
- Backer logos and real regulatory license data.
