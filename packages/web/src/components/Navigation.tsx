'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Menu, X, Github, Star } from 'lucide-react'

const navLinks = [
  { href: '/docs', label: 'Docs' },
  { href: 'https://github.com/Watchtower-Labs/watchtower-cli', label: 'GitHub', external: true },
  { href: '/docs/security', label: 'Security' },
  { href: '/pricing', label: 'Pricing' },
]

export function Navigation() {
  const [isOpen, setIsOpen] = useState(false)
  const [stars, setStars] = useState<number | null>(null)

  useEffect(() => {
    // Fetch GitHub stars (cached, non-blocking)
    fetch('https://api.github.com/repos/Watchtower-Labs/watchtower-cli')
      .then(res => res.json())
      .then(data => {
        if (data.stargazers_count) {
          setStars(data.stargazers_count)
        }
      })
      .catch(() => {
        // Silently fail - stars are optional
      })
  }, [])

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-b border-graphite-200">
      <div className="container-wide">
        <div className="flex items-center justify-between h-14">
          {/* Left: Nav links */}
          <div className="hidden md:flex items-center gap-6">
            {navLinks.map((link) => (
              link.external ? (
                <a
                  key={link.href}
                  href={link.href}
                  className="text-sm text-graphite-600 hover:text-graphite-950 transition-colors"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {link.label}
                </a>
              ) : (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-sm text-graphite-600 hover:text-graphite-950 transition-colors"
                >
                  {link.label}
                </Link>
              )
            ))}
          </div>

          {/* Center: Wordmark logo */}
          <Link href="/" className="absolute left-1/2 -translate-x-1/2 flex items-center">
            <span className="text-graphite-950 font-semibold tracking-tight">watchtower</span>
          </Link>

          {/* Right: Install button + GitHub stars */}
          <div className="hidden md:flex items-center gap-4">
            {/* GitHub stars badge */}
            <a
              href="https://github.com/Watchtower-Labs/watchtower-cli"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono text-graphite-600 bg-graphite-100 border border-graphite-200 hover:border-graphite-300 transition-colors"
            >
              <Github className="w-3.5 h-3.5" />
              <Star className="w-3 h-3" />
              {stars !== null ? (
                <span>{stars.toLocaleString()}</span>
              ) : (
                <span className="w-6 h-3 bg-graphite-200 animate-pulse" />
              )}
            </a>

            {/* Install button */}
            <Link
              href="/docs/quickstart"
              className="px-4 py-1.5 text-sm font-medium bg-graphite-950 text-white hover:bg-graphite-800 transition-colors"
            >
              Install
            </Link>
          </div>

          {/* Mobile: Logo left, menu right */}
          <div className="md:hidden flex items-center justify-between w-full">
            <Link href="/" className="flex items-center">
              <span className="text-graphite-950 font-semibold tracking-tight">watchtower</span>
            </Link>
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="p-2 text-graphite-600 hover:text-graphite-950"
              aria-label="Toggle menu"
            >
              {isOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {isOpen && (
          <div className="md:hidden py-4 border-t border-graphite-200">
            <div className="flex flex-col gap-1">
              {navLinks.map((link) => (
                link.external ? (
                  <a
                    key={link.href}
                    href={link.href}
                    className="px-3 py-2 text-sm text-graphite-600 hover:text-graphite-950 hover:bg-graphite-100"
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setIsOpen(false)}
                  >
                    {link.label}
                  </a>
                ) : (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="px-3 py-2 text-sm text-graphite-600 hover:text-graphite-950 hover:bg-graphite-100"
                    onClick={() => setIsOpen(false)}
                  >
                    {link.label}
                  </Link>
                )
              ))}
              <div className="mt-3 px-3">
                <Link
                  href="/docs/quickstart"
                  className="block w-full px-4 py-2 text-sm font-medium text-center bg-graphite-950 text-white hover:bg-graphite-800"
                >
                  Install
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}
