'use client'

import Link from 'next/link'

// Abstract contour visualization - computational, precise
function ContourVisualization() {
  return (
    <div className="relative w-full h-[400px] md:h-[480px]">
      {/* Grid background */}
      <div className="absolute inset-0 grid-pattern opacity-50" />

      {/* SVG Contour lines */}
      <svg
        viewBox="0 0 800 400"
        className="absolute inset-0 w-full h-full"
        preserveAspectRatio="xMidYMid slice"
        role="img"
        aria-label="Event flow visualization showing metrics over time"
      >
        <title>Event Flow Visualization</title>
        <desc>A contour plot showing the progression of events over time, with data nodes connected along a timeline from 0ms to 1 second</desc>
        {/* Background grid dots */}
        <defs>
          <pattern id="grid-dots" width="40" height="40" patternUnits="userSpaceOnUse">
            <circle cx="20" cy="20" r="1" fill="#D4D4D4" opacity="0.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid-dots)" />

        {/* Contour lines - time series inspired */}
        <g className="contour-line">
          {/* Outer contour */}
          <path
            d="M100 300 Q200 280 300 260 T500 220 T700 180"
            stroke="#E5E5E5"
            strokeWidth="1"
            fill="none"
          />
          <path
            d="M80 320 Q180 300 280 280 T480 240 T680 200"
            stroke="#D4D4D4"
            strokeWidth="1"
            fill="none"
          />

          {/* Middle contours - metrics/logs */}
          <path
            d="M120 280 Q220 240 320 220 T520 180 T720 160"
            stroke="#A3A3A3"
            strokeWidth="1.5"
            fill="none"
          />
          <path
            d="M140 260 Q240 200 340 180 T540 140 T740 120"
            stroke="#737373"
            strokeWidth="1.5"
            fill="none"
          />

          {/* Inner contour - active/highlighted */}
          <path
            d="M160 240 Q260 160 360 140 T560 100 T760 80"
            stroke="#06B6D4"
            strokeWidth="2"
            opacity="0.7"
            fill="none"
          />
        </g>

        {/* Data nodes */}
        <g>
          {/* Node connections */}
          <line x1="200" y1="220" x2="300" y2="180" stroke="#D4D4D4" strokeWidth="1" strokeDasharray="4 4" />
          <line x1="300" y1="180" x2="420" y2="150" stroke="#D4D4D4" strokeWidth="1" strokeDasharray="4 4" />
          <line x1="420" y1="150" x2="550" y2="130" stroke="#D4D4D4" strokeWidth="1" strokeDasharray="4 4" />
          <line x1="550" y1="130" x2="650" y2="110" stroke="#D4D4D4" strokeWidth="1" strokeDasharray="4 4" />

          {/* Nodes */}
          <circle cx="200" cy="220" r="4" fill="#FAFAFA" stroke="#737373" strokeWidth="1.5" />
          <circle cx="300" cy="180" r="4" fill="#FAFAFA" stroke="#737373" strokeWidth="1.5" />
          <circle cx="420" cy="150" r="5" fill="#06B6D4" stroke="#FAFAFA" strokeWidth="2" />
          <circle cx="550" cy="130" r="4" fill="#FAFAFA" stroke="#737373" strokeWidth="1.5" />
          <circle cx="650" cy="110" r="4" fill="#FAFAFA" stroke="#737373" strokeWidth="1.5" />

          {/* Active node pulse */}
          <circle cx="420" cy="150" r="12" fill="none" stroke="#06B6D4" strokeWidth="1" opacity="0.3">
            <animate attributeName="r" values="12;20;12" dur="2s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.3;0;0.3" dur="2s" repeatCount="indefinite" />
          </circle>
        </g>

        {/* Metric labels */}
        <g className="font-mono text-xs" fill="#737373">
          <text x="190" y="245" fontSize="10">event</text>
          <text x="290" y="205" fontSize="10">llm</text>
          <text x="405" y="175" fontSize="10" fill="#06B6D4">tool</text>
          <text x="540" y="155" fontSize="10">state</text>
          <text x="640" y="135" fontSize="10">end</text>
        </g>

        {/* Axis markers */}
        <g stroke="#E5E5E5" strokeWidth="1">
          <line x1="60" y1="350" x2="740" y2="350" />
          <line x1="60" y1="350" x2="60" y2="60" />
        </g>
        <g fill="#A3A3A3" className="font-mono" fontSize="9">
          <text x="60" y="365">0ms</text>
          <text x="400" y="365">500ms</text>
          <text x="720" y="365">1s</text>
          <text x="40" y="350" textAnchor="end">0</text>
          <text x="40" y="200" textAnchor="end">5</text>
          <text x="40" y="60" textAnchor="end">10</text>
        </g>
      </svg>
    </div>
  )
}

export function Hero() {
  return (
    <section className="relative min-h-screen pt-14">
      <div className="container-wide py-16 md:py-24">
        {/* Top: Pill tag */}
        <div className="text-center mb-6">
          <span className="pill">
            CLI-first observability.
          </span>
        </div>

        {/* Headline */}
        <h1 className="text-4xl md:text-5xl lg:text-display font-bold text-graphite-950 text-center max-w-4xl mx-auto mb-8 tracking-tight">
          See what your systems are doing — instantly.
        </h1>

        {/* Subheadline */}
        <p className="text-lg md:text-xl text-graphite-500 text-center max-w-2xl mx-auto mb-10">
          Terminal-native observability for AI agents. Watch tool calls, LLM requests,
          and execution traces stream through your terminal in real-time.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
          <Link
            href="/docs/quickstart"
            className="px-8 py-3.5 text-base font-medium bg-graphite-950 text-white hover:bg-graphite-800 transition-colors"
          >
            Install Watchtower
          </Link>
          <Link
            href="/docs"
            className="px-6 py-3.5 text-base font-medium text-graphite-600 hover:text-graphite-950 hover:underline underline-offset-4 transition-colors"
          >
            View Docs
          </Link>
        </div>

        {/* Abstract Visualization */}
        <ContourVisualization />
      </div>
    </section>
  )
}
