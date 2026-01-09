'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

/**
 * Header
 *
 * Floating glass navbar with premium design.
 */

const navLinks = [
  { href: '/docs', label: 'Documentation' },
  { href: '/docs/quickstart', label: 'Quickstart' },
  { href: 'https://github.com/Watchtower-Labs/watchtower-cli', label: 'GitHub', external: true },
]

export function Header() {
  const pathname = usePathname()

  return (
    <motion.header
      className="fixed top-0 left-0 right-0 z-50 px-4 pt-4"
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
    >
      <nav className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between px-2 py-2 rounded-2xl border border-white/10 bg-black/60 backdrop-blur-2xl shadow-[0_0_40px_rgba(0,0,0,0.5)]">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 pl-3">
            <div className="relative">
              {/* Icon mark */}
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              </div>
            </div>
            <span className="font-serif text-lg font-medium text-white hidden sm:block">
              Watchtower
            </span>
          </Link>

          {/* Center Navigation */}
          <div className="hidden md:flex items-center gap-6">
            {navLinks.map((link) => {
              const isActive = !link.external && pathname.startsWith(link.href)

              const linkContent = (
                <span
                  className={`
                    relative px-4 py-2 text-sm font-medium rounded-xl transition-colors cursor-pointer
                    ${isActive ? 'text-white' : 'text-gray-400 hover:text-white'}
                  `}
                >
                  <span className="relative z-10 flex items-center gap-1.5">
                    {link.label}
                    {link.external && (
                      <svg className="w-3 h-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M7 17L17 7M17 7H7M17 7V17" />
                      </svg>
                    )}
                  </span>
                </span>
              )

              return link.external ? (
                <a
                  key={link.href}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {linkContent}
                </a>
              ) : (
                <Link key={link.href} href={link.href}>
                  {linkContent}
                </Link>
              )
            })}
          </div>

          {/* Right side - CTA */}
          <div className="flex items-center gap-3 pr-1">
            {/* Mobile menu button */}
            <button className="md:hidden p-2 text-gray-400 hover:text-white transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            {/* Get Started button */}
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Link
                href="/docs/quickstart"
                className="hidden sm:flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-black bg-white rounded-xl hover:bg-gray-100 transition-colors"
              >
                Get Started
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </Link>
            </motion.div>
          </div>
        </div>
      </nav>
    </motion.header>
  )
}
