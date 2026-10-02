import type { RegionMetric } from '@/types'
import { cn } from '@/lib/utils'

export type MetricKey =
  | 'infantMortalityPer1000'
  | 'neonatalMortalityPer1000'
  | 'hospitalBeds'
  | 'nursingStaff'

interface RegionalMapProps {
  regions: RegionMetric[]
  metric: MetricKey
  selected: string | null
  onSelect: (region: string) => void
}

const METRIC_UNIT: Record<MetricKey, string> = {
  infantMortalityPer1000: '‰',
  neonatalMortalityPer1000: '‰',
  hospitalBeds: '',
  nursingStaff: '',
}

function formatMetric(value: number, metric: MetricKey) {
  if (metric === 'hospitalBeds' || metric === 'nursingStaff') {
    return new Intl.NumberFormat('ru-KZ').format(value)
  }
  return value.toFixed(2)
}

export function RegionalMap({
  regions,
  metric,
  selected,
  onSelect,
}: RegionalMapProps) {
  const values = regions.map((r) => r[metric])
  const min = Math.min(...values)
  const max = Math.max(...values)
  const intensity = (value: number) =>
    max === min ? 0.5 : (value - min) / (max - min)

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
      {regions.map((region) => {
        const value = region[metric]
        const t = intensity(value)
        const isSelected = selected === region.region
        return (
          <button
            key={region.region}
            onClick={() => onSelect(region.region)}
            aria-label={`Select ${region.region}`}
            className={cn(
              'flex min-h-32 flex-col items-start rounded-lg border p-3 text-left transition-all hover:shadow-sm',
              isSelected
                ? 'border-primary ring-2 ring-primary/30'
                : 'border-border',
            )}
            style={{
              backgroundColor: `hsl(var(--risk-${
                t < 0.34 ? 'low' : t < 0.67 ? 'moderate' : 'high'
              }) / ${0.12 + t * 0.34})`,
            }}
          >
            <span className="text-sm font-semibold leading-tight">
              {region.region}
            </span>
            <span className="mt-2 text-2xl font-bold tabular-nums">
              {formatMetric(value, metric)}
              <span className="ml-0.5 text-sm font-medium">
                {METRIC_UNIT[metric]}
              </span>
            </span>
            <span className="mt-auto pt-2 text-[11px] text-muted-foreground">
              {region.source}
            </span>
          </button>
        )
      })}
    </div>
  )
}
