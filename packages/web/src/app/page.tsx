import { Header } from '@/components/layout/Header'
import { HeroBackground } from '@/components/HeroBackground'
import { HeroSection } from '@/components/HeroSection'
import { FeaturesSection } from '@/components/FeaturesSection'
import { HowItWorksSection } from '@/components/HowItWorksSection'
import { TerminalSection } from '@/components/TerminalSection'
import { CTASection } from '@/components/CTASection'
import { Footer } from '@/components/Footer'

export default function Home() {
  return (
    <main className="relative bg-black overflow-hidden">
      {/* Navigation */}
      <Header />

      {/* Hero with dramatic gradient background */}
      <div className="relative min-h-screen">
        <HeroBackground />
        <HeroSection />
      </div>

      {/* Features */}
      <FeaturesSection />

      {/* Terminal preview */}
      <TerminalSection />

      {/* How it works */}
      <HowItWorksSection />

      {/* CTA */}
      <CTASection />

      {/* Footer */}
      <Footer />
    </main>
  )
}
