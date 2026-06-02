---
paths:
  - "app/**/*.{ts,tsx}"
  - "components/**/*.{ts,tsx}"
---

# Frontend rules

- The design source of truth is the `wireframe/` folder. Read the relevant
  screen there before building it; match layout, spacing, and hierarchy.
- All UI copy is in English.
- Visual system: dark-mode foundation, luxury-minimalist, glassmorphism panels,
  Swiss/editorial grid. Accent gradient #7C5CFF -> #4F8CFF -> #2DD4BF used
  sparingly (primary actions, active states, progress).
- Use Tailwind. Define colors, radii, and the accent gradient as tokens; do not
  scatter raw hex values across components.
- Components are small and composable. Keep data fetching out of presentational
  components.
- Build Sprint 1 against a mock data layer so screens render without a wallet.
- Accessible by default: sufficient contrast on dark surfaces, labelled inputs,
  keyboard-navigable controls.
