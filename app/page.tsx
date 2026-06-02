import { TopNav } from '@/components/layout/TopNav'
import { Footer } from '@/components/layout/Footer'
import { Hero } from '@/components/landing/Hero'
import { BenefitsGrid } from '@/components/landing/BenefitsGrid'
import { HowItWorks } from '@/components/landing/HowItWorks'
import { ClosingCTA } from '@/components/landing/ClosingCTA'

export default function LandingPage() {
  return (
    <>
      <TopNav />
      <main className="mx-auto max-w-container-max px-gutter md:px-margin-desktop">
        <Hero />
        <BenefitsGrid />
        <HowItWorks />
        <ClosingCTA />
      </main>
      <Footer />
    </>
  )
}
