'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'

const footerLinks = {
  product: [
    { label: 'Documentation', href: '/docs' },
    { label: 'Quickstart', href: '/docs/quickstart' },
    { label: 'CLI Reference', href: '/docs/cli/show' },
    { label: 'SDK Guide', href: '/docs/sdk' },
  ],
  resources: [
    { label: 'GitHub', href: 'https://github.com/Watchtower-Labs/watchtower-cli', external: true },
    { label: 'Issues', href: 'https://github.com/Watchtower-Labs/watchtower-cli/issues', external: true },
    { label: 'Releases', href: 'https://github.com/Watchtower-Labs/watchtower-cli/releases', external: true },
    { label: 'License', href: 'https://github.com/Watchtower-Labs/watchtower-cli/blob/main/LICENSE', external: true },
  ],
  community: [
    { label: 'Contributing', href: 'https://github.com/Watchtower-Labs/watchtower-cli/blob/main/CONTRIBUTING.md', external: true },
    { label: 'Star on GitHub', href: 'https://github.com/Watchtower-Labs/watchtower-cli', external: true },
  ],
}

function FooterLink({ href, label, external }: { href: string; label: string; external?: boolean }) {
  const className = "text-sm text-gray-500 hover:text-white transition-colors duration-200"

  if (external) {
    return (
      <a href={href} className={className} target="_blank" rel="noopener noreferrer">
        {label}
      </a>
    )
  }

  return (
    <Link href={href} className={className}>
      {label}
    </Link>
  )
}

export function Footer() {
  return (
    <footer className="relative border-t border-white/5 bg-black">
      {/* Gradient accent at top */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-purple-500/50 to-transparent" />

      <div className="container-wide pt-16 pb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-12 lg:gap-8">
          {/* Brand column */}
          <div className="lg:col-span-5">
            <Link href="/" className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              </div>
              <span className="font-serif text-xl font-medium text-white">Watchtower</span>
            </Link>

            <p className="text-gray-500 text-sm leading-relaxed max-w-sm mb-6">
              Terminal-native observability for Google ADK agents.
              Debug your AI agents without leaving the command line.
            </p>

            {/* Install command */}
            <div className="inline-flex items-center gap-3 px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl">
              <span className="text-gray-600 font-mono text-sm">$</span>
              <code className="text-sm font-mono text-gray-300">pip install watchtower-adk</code>
              <motion.button
                className="text-gray-500 hover:text-white transition-colors"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigator.clipboard.writeText('pip install watchtower-adk')}
                title="Copy to clipboard"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                  <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                </svg>
              </motion.button>
            </div>
          </div>

          {/* Links columns */}
          <div className="lg:col-span-7">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-8">
              {/* Product */}
              <div>
                <h4 className="text-xs font-semibold text-white uppercase tracking-wider mb-4">
                  Product
                </h4>
                <ul className="space-y-3">
                  {footerLinks.product.map((link) => (
                    <li key={link.href}>
                      <FooterLink {...link} />
                    </li>
                  ))}
                </ul>
              </div>

              {/* Resources */}
              <div>
                <h4 className="text-xs font-semibold text-white uppercase tracking-wider mb-4">
                  Resources
                </h4>
                <ul className="space-y-3">
                  {footerLinks.resources.map((link) => (
                    <li key={link.href}>
                      <FooterLink {...link} external />
                    </li>
                  ))}
                </ul>
              </div>

              {/* Community */}
              <div>
                <h4 className="text-xs font-semibold text-white uppercase tracking-wider mb-4">
                  Community
                </h4>
                <ul className="space-y-3">
                  {footerLinks.community.map((link) => (
                    <li key={link.href}>
                      <FooterLink {...link} external />
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 pt-6 border-t border-white/5">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-xs text-gray-600">
              Open source under MIT license. Built by{' '}
              <a
                href="https://github.com/Watchtower-Labs"
                className="text-gray-500 hover:text-white transition-colors"
                target="_blank"
                rel="noopener noreferrer"
              >
                Watchtower Labs
              </a>
            </p>

            {/* Social links */}
            <div className="flex items-center gap-4">
              <a
                href="https://github.com/Watchtower-Labs/watchtower-cli"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-600 hover:text-white transition-colors"
                aria-label="GitHub"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.87 8.17 6.84 9.5.5.08.66-.23.66-.5v-1.69c-2.77.6-3.36-1.34-3.36-1.34-.46-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.87 1.52 2.34 1.07 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.92 0-1.11.38-2 1.03-2.71-.1-.25-.45-1.29.1-2.64 0 0 .84-.27 2.75 1.02.79-.22 1.65-.33 2.5-.33.85 0 1.71.11 2.5.33 1.91-1.29 2.75-1.02 2.75-1.02.55 1.35.2 2.39.1 2.64.65.71 1.03 1.6 1.03 2.71 0 3.82-2.34 4.66-4.57 4.91.36.31.69.92.69 1.85V21c0 .27.16.59.67.5C19.14 20.16 22 16.42 22 12A10 10 0 0012 2z" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
