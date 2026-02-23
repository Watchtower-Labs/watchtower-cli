'use client'

const metrics = [
  {
    value: '10M+',
    label: 'Events monitored daily',
    sublabel: 'across all deployments',
  },
  {
    value: '<100ms',
    label: 'Ingest latency',
    sublabel: 'p99 event capture',
  },
  {
    value: 'OSS',
    label: 'Open-source core',
    sublabel: 'MIT licensed',
  },
  {
    value: '0',
    label: 'External dependencies',
    sublabel: 'runs entirely local',
  },
]

const usedBy = [
  'Security teams',
  'Infra engineers',
  'AI developers',
  'Platform teams',
]

export function Metrics() {
  return (
    <section className="py-16 md:py-24 border-t border-graphite-200">
      <div className="container-wide">
        {/* Metrics grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12 mb-16">
          {metrics.map((metric) => (
            <div key={metric.label} className="text-center md:text-left">
              <div className="text-3xl md:text-4xl font-bold text-graphite-950 font-mono tracking-tight mb-1">
                {metric.value}
              </div>
              <div className="text-sm font-medium text-graphite-700 mb-0.5">
                {metric.label}
              </div>
              <div className="text-xs text-graphite-400">
                {metric.sublabel}
              </div>
            </div>
          ))}
        </div>

        {/* Used by */}
        <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 pt-8 border-t border-graphite-100">
          <span className="text-xs text-graphite-400 uppercase tracking-wider">Used by</span>
          {usedBy.map((team) => (
            <span
              key={team}
              className="text-sm text-graphite-500"
            >
              {team}
            </span>
          ))}
        </div>
      </div>
    </section>
  )
}
