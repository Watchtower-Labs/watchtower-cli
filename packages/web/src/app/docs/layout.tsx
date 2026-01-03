'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Menu, X, ChevronRight, Terminal, BookOpen, Cpu, Wrench, HelpCircle } from 'lucide-react'

const sidebarLinks = [
  {
    title: 'Getting Started',
    links: [
      { href: '/docs', label: 'Introduction', icon: BookOpen },
      { href: '/docs/installation', label: 'Installation', icon: Terminal },
      { href: '/docs/quickstart', label: 'Quick Start', icon: ChevronRight },
    ],
  },
  {
    title: 'CLI Reference',
    links: [
      { href: '/docs/cli/show', label: 'watchtower show', icon: Terminal },
      { href: '/docs/cli/tail', label: 'watchtower tail', icon: Terminal },
      { href: '/docs/cli/list', label: 'watchtower list', icon: Terminal },
      { href: '/docs/cli/config', label: 'watchtower config', icon: Wrench },
    ],
  },
  {
    title: 'SDK',
    links: [
      { href: '/docs/sdk', label: 'Python SDK', icon: Cpu },
    ],
  },
  {
    title: 'More',
    links: [
      { href: '/docs/troubleshooting', label: 'Troubleshooting', icon: HelpCircle },
    ],
  },
]

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-white/10">
        <div className="flex items-center justify-between h-16 px-6">
          <div className="flex items-center gap-4">
            <button
              className="lg:hidden text-white p-2"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              aria-label="Toggle sidebar"
            >
              {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <span className="text-white font-bold text-sm">W</span>
              </div>
              <span className="text-white font-semibold text-lg">watchtower</span>
            </Link>
            <span className="text-muted">/</span>
            <span className="text-white">docs</span>
          </div>
          <div className="flex items-center gap-4">
            <a
              href="https://github.com/Watchtower-Labs/watchtower-cli"
              className="text-muted hover:text-white transition-colors text-sm"
              target="_blank"
              rel="noopener noreferrer"
            >
              GitHub
            </a>
          </div>
        </div>
      </header>

      <div className="flex pt-16">
        {/* Sidebar */}
        <aside
          className={`fixed lg:sticky top-16 left-0 z-40 w-72 h-[calc(100vh-4rem)] bg-background border-r border-white/10 overflow-y-auto transition-transform lg:translate-x-0 ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <nav className="p-6">
            {sidebarLinks.map((section) => (
              <div key={section.title} className="mb-8">
                <h3 className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">
                  {section.title}
                </h3>
                <ul className="space-y-1">
                  {section.links.map((link) => {
                    const Icon = link.icon
                    const isActive = pathname === link.href
                    return (
                      <li key={link.href}>
                        <Link
                          href={link.href}
                          className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                            isActive
                              ? 'bg-primary/20 text-white'
                              : 'text-muted hover:text-white hover:bg-white/5'
                          }`}
                          onClick={() => setSidebarOpen(false)}
                        >
                          <Icon size={16} />
                          {link.label}
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              </div>
            ))}
          </nav>
        </aside>

        {/* Overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-30 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main content */}
        <main className="flex-1 min-w-0">
          <div className="max-w-4xl mx-auto px-6 py-12">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
