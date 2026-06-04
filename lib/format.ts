import type { Address } from './web3/types'

export function formatUSD(value: number): string {
  // Show cents only when the magnitude is below $1 so a real sub-dollar holding
  // never renders as "$0"; keep whole-dollar formatting otherwise.
  const fractionDigits = value !== 0 && Math.abs(value) < 1 ? 2 : 0
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
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
