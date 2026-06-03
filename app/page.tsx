import { MarketingShell } from '@/components/layout/MarketingShell'
import { Hero } from '@/components/landing/Hero'
import { StatsStrip } from '@/components/landing/StatsStrip'
import { BenefitsGrid } from '@/components/landing/BenefitsGrid'
import { SupportedAssets } from '@/components/landing/SupportedAssets'
import { SecuritySection } from '@/components/landing/SecuritySection'
import { HowItWorks } from '@/components/landing/HowItWorks'
import { FaqSection } from '@/components/landing/FaqSection'
import { ClosingCTA } from '@/components/landing/ClosingCTA'

export default function LandingPage() {
  return (
    <MarketingShell>
      <Hero />
      <StatsStrip />
      <BenefitsGrid />
      <SupportedAssets />
      <SecuritySection />
      <HowItWorks />
      <FaqSection />
      <ClosingCTA />
    </MarketingShell>
  )
}
