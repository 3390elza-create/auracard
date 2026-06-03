// Single source of truth for marketing facts shown across the site.
// Keep these values real and configurable — never fabricate on-chain data.

export const SUPPORTED_NETWORKS = ['Ethereum', 'Base', 'Arbitrum', 'Polygon'] as const

export const COLLATERAL_TOKENS = ['ETH', 'WBTC', 'USDC'] as const

export const SUPPORTED_WALLETS = [
  { name: 'MetaMask', icon: '/wallets/metamask.svg' },
  { name: 'WalletConnect', icon: '/wallets/walletconnect.svg' },
  { name: 'Coinbase Wallet', icon: '/wallets/coinbase.svg' },
  { name: 'Rainbow', icon: '/wallets/rainbow.svg' },
] as const

// Loan-to-value limits (market-standard, prudent). Displayed as configurable copy.
export const LTV = {
  blueChip: 50, // ETH, WBTC
  stablecoin: 80, // USDC
  headline: 'Spend up to 50% of your crypto — up to 80% on stablecoins.',
} as const

// Social-proof figure provided by the business. Stored here so it stays
// auditable and updatable in one place rather than hard-coded in components.
export const MEMBER_COUNT = '11,000+'

export const SUPPORT_EMAIL = 'contact@auracard.io'

export interface Faq {
  question: string
  answer: string
}

export const FAQS: Faq[] = [
  {
    question: 'Do I need KYC?',
    answer:
      'No. Checking your eligibility and viewing your limit needs zero documents — no ID, no selfie, no proof of address, and no credit-bureau check. Aura reads only public on-chain data.',
  },
  {
    question: 'Do you ever move my funds?',
    answer:
      'Never. Aura is non-custodial. We read your balances on a read-only basis to assess your card. No operator key can move your funds — withdrawal is your exclusive right.',
  },
  {
    question: 'Which networks and tokens are supported?',
    answer:
      'Networks: Ethereum, Base, Arbitrum and Polygon. Accepted collateral: ETH, WBTC and USDC. Support expands over time.',
  },
  {
    question: 'How is my limit calculated?',
    answer:
      'From the value of the crypto you hold. You can spend up to 50% of blue-chip assets (ETH, WBTC) and up to 80% on stablecoins (USDC). Limits update as your balances change.',
  },
  {
    question: 'What happens if my collateral drops in value?',
    answer:
      'If your collateral falls below the required level, part of it may be liquidated to cover your balance. You stay in control and can add collateral or repay to avoid it.',
  },
  {
    question: 'Which wallets can I use?',
    answer:
      'MetaMask, WalletConnect, Coinbase Wallet and Rainbow. You connect and sign a plain login message (SIWE) — never a transaction or an open-ended approval.',
  },
]
