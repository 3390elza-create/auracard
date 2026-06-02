'use client'

import { MOCK_DASHBOARD } from './data'
import type { DashboardData } from './types'

export function useDashboardMock(): DashboardData {
  return MOCK_DASHBOARD
}
