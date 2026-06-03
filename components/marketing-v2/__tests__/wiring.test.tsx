import { describe, it, expect, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { IssueFlowProvider } from '../issue-flow/IssueFlowProvider'
import { IssueCardFlow } from '../issue-flow/IssueCardFlow'
import { HeroV2 } from '../HeroV2'
import { ClosingCtaV2 } from '../ClosingCtaV2'
import { PremiumCardSection } from '../PremiumCardSection'
import { SiteFooterV2 } from '../SiteFooterV2'

// next/link needs the app-router context at runtime; the footer renders link
// columns, so stub it with a plain anchor that preserves href.
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

// useSiweLogin pulls in wagmi/router context we don't mount in a unit test; the
// modal only needs it on the connect step, so stub it to an idle state.
vi.mock('@/lib/web3/hooks/useSiweLogin', () => ({
  useSiweLogin: () => ({ state: { status: 'idle' }, start: () => {}, reset: () => {} }),
}))

describe('marketing-v2 issue-card flow wiring', () => {
  it('hero CTA opens the flow as a button, not a /connect link', () => {
    const html = renderToStaticMarkup(
      <IssueFlowProvider>
        <HeroV2 />
      </IssueFlowProvider>,
    )
    expect(html).toContain('Issue Card')
    expect(html).toContain('<button')
    expect(html).not.toContain('href="/connect"')
  })

  it('closing CTA opens the flow as a button, not a /connect link', () => {
    const html = renderToStaticMarkup(
      <IssueFlowProvider>
        <ClosingCtaV2 />
      </IssueFlowProvider>,
    )
    expect(html).toContain('<button')
    expect(html).not.toContain('href="/connect"')
  })

  it('premium Check Eligibility opens the flow as a button, not a /connect link', () => {
    const html = renderToStaticMarkup(
      <IssueFlowProvider>
        <PremiumCardSection />
      </IssueFlowProvider>,
    )
    expect(html).toContain('Check Eligibility')
    expect(html).toContain('<button')
    expect(html).not.toContain('href="/connect"')
  })

  it('modal card-select step lists the three card tiers', () => {
    const html = renderToStaticMarkup(<IssueCardFlow onClose={() => {}} />)
    expect(html).toContain('Issue Card')
    expect(html).toContain('Select the card')
    expect(html).toContain('White')
    expect(html).toContain('Blue')
    expect(html).toContain('Metal')
    expect(html).toContain('Continue')
  })

  it('footer contains no fabricated license numbers', () => {
    const html = renderToStaticMarkup(<SiteFooterV2 />)
    expect(html).not.toMatch(/FRN|FINTRAC|SVF\d|M2284|R197432/i)
  })
})
