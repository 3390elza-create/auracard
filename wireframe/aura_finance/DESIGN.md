---
name: Aura Finance
colors:
  surface: '#131318'
  surface-dim: '#131318'
  surface-bright: '#39383e'
  surface-container-lowest: '#0e0e13'
  surface-container-low: '#1b1b20'
  surface-container: '#1f1f24'
  surface-container-high: '#2a292f'
  surface-container-highest: '#35343a'
  on-surface: '#e4e1e9'
  on-surface-variant: '#c9c4d8'
  inverse-surface: '#e4e1e9'
  inverse-on-surface: '#303036'
  outline: '#938ea1'
  outline-variant: '#484555'
  surface-tint: '#cabeff'
  primary: '#cabeff'
  on-primary: '#31009a'
  primary-container: '#947dff'
  on-primary-container: '#2a0088'
  inverse-primary: '#603ce2'
  secondary: '#afc6ff'
  on-secondary: '#002d6c'
  secondary-container: '#045ecf'
  on-secondary-container: '#d5e0ff'
  tertiary: '#3cddc7'
  on-tertiary: '#003731'
  tertiary-container: '#00a392'
  on-tertiary-container: '#00302a'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#e6deff'
  primary-fixed-dim: '#cabeff'
  on-primary-fixed: '#1c0062'
  on-primary-fixed-variant: '#4816cb'
  secondary-fixed: '#d9e2ff'
  secondary-fixed-dim: '#afc6ff'
  on-secondary-fixed: '#001a43'
  on-secondary-fixed-variant: '#004398'
  tertiary-fixed: '#62fae3'
  tertiary-fixed-dim: '#3cddc7'
  on-tertiary-fixed: '#00201c'
  on-tertiary-fixed-variant: '#005047'
  background: '#131318'
  on-background: '#e4e1e9'
  surface-variant: '#35343a'
  aurora-violet: '#7C5CFF'
  aurora-blue: '#4F8CFF'
  aurora-teal: '#2DD4BF'
  glass-fill: rgba(255, 255, 255, 0.07)
  glass-border: rgba(255, 255, 255, 0.12)
  text-primary: '#F7F9FA'
  text-secondary: '#A0A9BE'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 64px
    fontWeight: '600'
    lineHeight: '1.1'
    letterSpacing: -0.04em
  headline-lg:
    fontFamily: Inter
    fontSize: 40px
    fontWeight: '600'
    lineHeight: '1.2'
    letterSpacing: -0.03em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '600'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '500'
    lineHeight: '1.3'
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '500'
    lineHeight: '1.4'
    letterSpacing: 0.02em
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: '1.2'
    letterSpacing: 0.05em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 4px
  container-max: 1280px
  gutter: 24px
  margin-mobile: 20px
  margin-desktop: 40px
  stack-sm: 8px
  stack-md: 16px
  stack-lg: 32px
---

## Brand & Style

This design system embodies a **Luxury-Minimalist** aesthetic tailored for high-net-worth crypto investors. The brand personality is serious, trustworthy, and futuristic, yet restrained—avoiding the loud, "hyper-tech" tropes of traditional crypto platforms in favor of a sophisticated financial institution feel.

The visual direction is rooted in **Glassmorphism** and **Swiss Design** principles. It utilizes a dark, immersive canvas with deep layering and soft environmental lighting to create a sense of infinite depth. The user experience should feel calm and effortless, prioritizing clarity and high-end editorial layouts over dense data visualization.

## Colors

The palette is anchored by a near-black foundation (#0B0B10), providing a high-contrast stage for the vibrant accent gradient. 

- **Foundation:** The background is not a flat black but a deep charcoal, allowing the low-intensity aurora gradients (Violet to Teal) to appear as if they are glowing from beneath the UI surface.
- **Accents:** A signature three-stop gradient (#7C5CFF → #4F8CFF → #2DD4BF) is reserved for high-priority actions, active states, and growth indicators.
- **Glassmorphism:** Interactive panels utilize a consistent 7% white opacity with a subtle 1px border to define boundaries without heavy visual weight.
- **Functional Colors:** Use `#1199FA` for informational states and maintained legibility in complex data charts.

## Typography

The typography system relies exclusively on **Inter** to achieve a modern, geometric, and systematic feel. 

- **Headings:** Should be set with tight letter-spacing and substantial weight to create a strong editorial hierarchy. "Display" sizes are reserved for hero balances and marketing statements.
- **Body Text:** Designed for maximum readability on dark backgrounds; avoid pure white (#FFFFFF) for long-form text, using the neutral `text-secondary` instead to reduce eye strain.
- **Localization:** The entire product UI is in **English** (per `CLAUDE.md`). Keep microcopy concise so labels do not break the tight grid layout. (Historical note: an earlier draft targeted Brazilian Portuguese; the product direction is now English-only.)

## Layout & Spacing

This design system uses a **Fixed Grid** model for desktop and a **Fluid Fluid** model for mobile to maintain editorial control.

- **Grid:** A 12-column grid on desktop with 24px gutters. Elements should align strictly to the grid lines, emphasizing horizontal rules and vertical alignment.
- **Whitespace:** Use generous margins (40px+) between major sections to create a premium "breathing" effect.
- **Rhythm:** Spacing follows a 4px base unit. Component internal padding should be consistent (e.g., 24px padding for all glass panels).
- **Mobile:** Transition to a 4-column grid with reduced margins (20px). Content reflows vertically, maintaining the same 16-20px corner radius on all cards.

## Elevation & Depth

Hierarchy is established through **Backdrop Blurs** and **Tonal Layering** rather than traditional shadows.

1.  **Level 0 (Base):** Near-black (#0B0B10) with 600px wide, heavily blurred aurora gradients in the background.
2.  **Level 1 (Panels):** Translucent glass cards (7% white) with a 20px backdrop blur. This level uses a subtle 1px white border at 12% opacity to define the shape.
3.  **Level 2 (Modals/Popovers):** Higher opacity (12% white) with a 40px backdrop blur and a very soft, large-radius black shadow (30% opacity) to provide separation from Level 1.
4.  **Micro-Depth:** Use thin 1px separators in `glass-border` color to divide content within a single panel.

## Shapes

The shape language is sophisticated and approachable. All primary UI containers (Cards, Modals) utilize a **16px to 20px** corner radius. Small interactive elements like buttons use a slightly smaller 12px radius to feel more precise.

Icons should be "thin line" (1.5px stroke width) with rounded caps to match the geometric nature of the Inter typeface. Avoid filled icons unless used for active navigation states.

## Components

- **Primary Buttons:** Features the signature gradient (#7C5CFF to #2DD4BF). Text should be bold, white, and centered. No shadows; the glow comes from the gradient itself.
- **Glass Cards:** The primary container for information. Requires `backdrop-filter: blur(20px)` and a subtle internal padding of 24px.
- **Input Fields:** Minimalist design with a bottom border (1px) in `text-secondary` color. When focused, the border transitions to the primary gradient.
- **Chips/Badges:** Small, high-contrast labels for crypto tickers (e.g., BTC, ETH). Use a semi-transparent background (15% opacity) of the brand color with the label in the solid brand color.
- **Progress Indicators:** Use the teal (#2DD4BF) end of the gradient for positive growth and the violet (#7C5CFF) end for neutral/loading states.
- **Credit Card Visualizer:** A high-fidelity glass component representing the physical card, utilizing more intense aurora blurs and a subtle metallic shimmer effect on the chip icon.