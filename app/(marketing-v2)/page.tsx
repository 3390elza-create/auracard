import { SiteHeaderV2 } from '@/components/marketing-v2/SiteHeaderV2'
import { HeroV2 } from '@/components/marketing-v2/HeroV2'
import { WalletMarquee } from '@/components/marketing-v2/WalletMarquee'
import { BackersStrip } from '@/components/marketing-v2/BackersStrip'
import { FeaturesGrid } from '@/components/marketing-v2/FeaturesGrid'
import { RewardsSection } from '@/components/marketing-v2/RewardsSection'
import { PremiumCardSection } from '@/components/marketing-v2/PremiumCardSection'
import { ClosingCtaV2 } from '@/components/marketing-v2/ClosingCtaV2'
import { SiteFooterV2 } from '@/components/marketing-v2/SiteFooterV2'
import { ScrollToTop } from '@/components/marketing-v2/ScrollToTop'

export const metadata = {
  title: 'AuraCard — Spend Crypto Like Cash. Everywhere.',
  description: 'The first card that connects directly to your crypto wallet.',
}

export default function HomeV2() {
  return (
    <div id="top" className="relative isolate z-0 min-h-screen bg-background text-foreground">
      <SiteHeaderV2 />
      <main className="overflow-hidden">
        <HeroV2 />
        <WalletMarquee />
        <BackersStrip />
        <FeaturesGrid />
        <RewardsSection />
        <PremiumCardSection />
        <ClosingCtaV2 />
      </main>
      <SiteFooterV2 />
      <ScrollToTop />
    </div>
  )
}
