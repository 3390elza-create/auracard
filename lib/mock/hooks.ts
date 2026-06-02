'use client'

import { MOCK_DASHBOARD, MOCK_WALLET } from './data'
import type { DashboardData, WalletSession } from './types'

export function useDashboardMock(): DashboardData {
  return MOCK_DASHBOARD
}

export function useWalletMock(): WalletSession {
  return MOCK_WALLET
}
