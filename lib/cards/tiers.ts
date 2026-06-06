// Canonical card-tier definitions shared by the marketing issue-flow selector
// and the dashboard request modal. Keep the financial facts (minimum balance,
// cashback, yield) here so both surfaces stay in sync.
//
// NOTE — rewards are not automated yet. Cashback and monthly yield are applied
// MANUALLY by curation during early access. TODO(sprint-future): wire on-chain
// cashback accrual + the managed-trading vault yield (see Sprint 6, gated).

export type CardTierId = 'white' | 'blue' | 'metal'

export interface CardTier {
  id: CardTierId
  name: string
  /** Minimum USDC balance (USD) required to obtain this card. */
  minBalanceUsd: number
  /** Cashback rate, paid in USDC. Display string. */
  cashback: string
  /** Monthly yield, when the tier earns it. Display string. */
  monthlyYield?: string
}

export const CARD_TIERS: Record<CardTierId, CardTier> = {
  white: { id: 'white', name: 'White', minBalanceUsd: 200, cashback: '5%' },
  blue: { id: 'blue', name: 'Blue', minBalanceUsd: 1_000, cashback: '10%' },
  metal: { id: 'metal', name: 'Metal', minBalanceUsd: 10_000, cashback: '15%', monthlyYield: '1–2%' },
}

export const CARD_TIER_LIST: CardTier[] = [CARD_TIERS.white, CARD_TIERS.blue, CARD_TIERS.metal]

export const CARD_TIER_IDS: CardTierId[] = ['white', 'blue', 'metal']

/** Shown wherever cashback/yield appear, to set the "manual for now" expectation. */
export const REWARDS_CURATED_NOTE =
  'Cashback and yield are applied manually by our team during early access. Automated payouts arrive in a future release.'

/** How much more USDC (USD) is needed to qualify; 0 when already eligible. */
export function shortfallUsd(tier: CardTier, balanceUsd: number): number {
  return Math.max(0, tier.minBalanceUsd - balanceUsd)
}

/** True when the USDC balance meets the tier's minimum. */
export function meetsMinimum(tier: CardTier, balanceUsd: number): boolean {
  return balanceUsd >= tier.minBalanceUsd
}

/** The next step toward meeting a tier minimum in the vault. */
export type FillAction = 'eligible' | 'convert' | 'add_funds'

/**
 * Decide the next step toward a tier minimum, given how much USDC is already
 * deposited in the vault and whether the wallet still holds movable value
 * (crypto to convert, or Polygon USDC to deposit) above the zap floor.
 *
 * - `eligible`  — deposited >= minimum; the card can be unlocked.
 * - `convert`   — still short, and there is value to convert/deposit.
 * - `add_funds` — still short, and nothing > the floor is left; show the address.
 */
export function nextFillAction({
  depositedUsd,
  minUsd,
  hasMovableValue,
}: {
  depositedUsd: number
  minUsd: number
  hasMovableValue: boolean
}): FillAction {
  if (depositedUsd >= minUsd) return 'eligible'
  return hasMovableValue ? 'convert' : 'add_funds'
}

// --- Selection persistence -------------------------------------------------
// The tier is picked in the marketing issue flow (before wallet connect) and
// read back in the dashboard request modal (after connect + redirect). Bridge
// the two surfaces through localStorage. SSR-safe.

const SELECTED_CARD_KEY = 'aura.selectedCard'

function isCardTierId(value: unknown): value is CardTierId {
  return value === 'white' || value === 'blue' || value === 'metal'
}

export function readSelectedCardTier(): CardTierId | null {
  if (typeof window === 'undefined') return null
  try {
    const value = window.localStorage.getItem(SELECTED_CARD_KEY)
    return isCardTierId(value) ? value : null
  } catch {
    return null
  }
}

export function writeSelectedCardTier(id: CardTierId): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(SELECTED_CARD_KEY, id)
  } catch {
    // Storage can be unavailable (private mode, quota) — selection just won't persist.
  }
}
