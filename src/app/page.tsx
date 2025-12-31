import { Navigation } from '@/components/Navigation'
import { Hero } from '@/components/Hero'
import { Features } from '@/components/Features'
import { HowItWorks } from '@/components/HowItWorks'
import { CodeExample } from '@/components/CodeExample'
import { Benefits } from '@/components/Benefits'
import { CTA } from '@/components/CTA'
import { Footer } from '@/components/Footer'

export default function Home() {
  return (
    <main className="min-h-screen bg-background">
      <Navigation />
      <Hero />
      <Features />
      <HowItWorks />
      <CodeExample />
      <Benefits />
      <CTA />
      <Footer />
    </main>
  )
}
