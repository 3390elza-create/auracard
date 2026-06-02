---
name: glass-panel
description: Create a glassmorphism dashboard panel component matching the project's dark, luxury-minimalist design. Use when building any card or panel for the dashboard (balance, status, limit, activity timeline).
---

# Glass panel component

Build a reusable panel that matches the wireframe's glassmorphism style.

Style: translucent surface (white at ~6-8% opacity over the dark background),
1px subtle border, backdrop blur, soft diffuse shadow, 16-20px radius. Flat —
no neon, no heavy shadows.

Steps:
1. Read the relevant screen in `wireframe/` for exact spacing and content.
2. Create a `Panel` component in `components/` that accepts a title and children.
3. Use Tailwind tokens for color/radius; reference the accent gradient only for
   active states or progress, not for the panel background.
4. Keep it presentational — no data fetching inside.
5. Add a usage example and verify it renders with both mock and real data.
