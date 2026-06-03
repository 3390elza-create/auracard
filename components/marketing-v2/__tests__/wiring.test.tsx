import { describe, it, expect, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { HeroV2 } from '../HeroV2'
import { ClosingCtaV2 } from '../ClosingCtaV2'
import { PremiumCardSection } from '../PremiumCardSection'
import { SiteFooterV2 } from '../SiteFooterV2'

// next/link needs the app-router context at runtime; in this unit test we render
// the components in isolation, so stub it with a plain anchor that preserves href.
vi.mock('next/link', () => ({
  default: (props: { href?: unknown; children?: unknown } & Record<string, unknown>) => {
    const { href, children, ...rest } = props
    return require('react').createElement(
      'a',
      { href: typeof href === 'string' ? href : String(href), ...rest },
      children,
    )
  },
}))

describe('marketing-v2 wiring', () => {
  it('hero Issue Card links to /connect', () => {
    const html = renderToStaticMarkup(<HeroV2 />)
    expect(html).toContain('Issue Card')
    expect(html).toContain('href="/connect"')
    // Learn More is the only other link and points at an in-page anchor, not /connect.
    expect(html.match(/href="\/connect"/g)).toHaveLength(1)
  })

  it('closing CTA links to /connect', () => {
    const html = renderToStaticMarkup(<ClosingCtaV2 />)
    expect(html).toContain("Issue Card")
    expect(html.match(/href="\/connect"/g)).toHaveLength(1)
  })

  it('premium Check Eligibility links to /connect', () => {
    const html = renderToStaticMarkup(<PremiumCardSection />)
    expect(html).toContain('Check Eligibility')
    expect(html.match(/href="\/connect"/g)).toHaveLength(1)
  })

  it('footer contains no fabricated license numbers', () => {
    const html = renderToStaticMarkup(<SiteFooterV2 />)
    expect(html).not.toMatch(/FRN|FINTRAC|SVF\d|M2284|R197432/i)
  })
})
