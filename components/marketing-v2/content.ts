export const BRAND = {
  name: 'AuraCard',
  logo: '/logo.png',
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
  image: '/marketing/metal-card.avif',
} as const

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

// Card tiers shown in the Issue-Card modal flow. Selection is purely a visual
// lead-in; real provisioning happens in the dashboard after wallet connect.
export type IssueCardId = 'white' | 'blue' | 'metal'

export interface IssueCardOption {
  id: IssueCardId
  name: string
  blurb: string
  cashback: string
  annualFee: string
  requirement?: string
  perks: string[]
}

export const ISSUE_CARDS: IssueCardOption[] = [
  {
    id: 'white',
    name: 'White',
    blurb: 'Earn up to 5% back in BTC, ETH, or stablecoins on every purchase.',
    cashback: 'Up to 5%',
    annualFee: 'Free',
    perks: ['Airport lounges', '24/7 concierge', 'Hotel upgrades', 'Priority support'],
  },
  {
    id: 'blue',
    name: 'Blue',
    blurb: 'Earn up to 5% back in BTC, ETH, or stablecoins on every purchase.',
    cashback: 'Up to 5%',
    annualFee: 'Free',
    perks: ['Airport lounges', '24/7 concierge', 'Hotel upgrades', 'Priority support'],
  },
  {
    id: 'metal',
    name: 'Metal',
    blurb: 'Hold $20,000 or more in your portfolio and receive the physical metal card.',
    cashback: 'Up to 5%',
    annualFee: 'Free',
    requirement: '$20K+',
    perks: ['Premium metal design', 'Airport lounges', 'Dedicated concierge', '2x rewards multiplier'],
  },
]
