'use client'

import { Github, Twitter } from 'lucide-react'

const footerLinks = {
  Product: [
    { label: 'Features', href: '#features' },
    { label: 'How it Works', href: '#how-it-works' },
    { label: 'Benefits', href: '#benefits' },
  ],
  Resources: [
    { label: 'Documentation', href: '#' },
    { label: 'GitHub', href: 'https://github.com' },
    { label: 'Changelog', href: '#' },
  ],
  Community: [
    { label: 'Discord', href: '#' },
    { label: 'Twitter', href: '#' },
    { label: 'Contributing', href: '#' },
  ],
}

export function Footer() {
  return (
    <footer className="py-16 border-t border-white/10">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-12 mb-12">
          {/* Brand */}
          <div className="md:col-span-2">
            <a href="/" className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <span className="text-white font-bold text-sm">W</span>
              </div>
              <span className="text-white font-semibold text-lg">watchtower</span>
            </a>
            <p className="text-muted text-sm max-w-xs mb-4">
              Terminal-based observability for Google ADK agents.
              Built by Watchtower Labs.
            </p>
            <div className="flex gap-4">
              <a href="https://github.com" className="text-muted hover:text-white transition-colors">
                <Github className="w-5 h-5" />
              </a>
              <a href="https://twitter.com" className="text-muted hover:text-white transition-colors">
                <Twitter className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Links */}
          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h4 className="text-white font-semibold mb-4">{category}</h4>
              <ul className="space-y-3">
                {links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-muted text-sm hover:text-white transition-colors"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom */}
        <div className="pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-muted text-sm">
            &copy; {new Date().getFullYear()} Watchtower Labs. Open source under MIT license.
          </p>
          <div className="flex gap-6 text-sm">
            <a href="#" className="text-muted hover:text-white transition-colors">Privacy</a>
            <a href="#" className="text-muted hover:text-white transition-colors">Terms</a>
          </div>
        </div>
      </div>
    </footer>
  )
}
