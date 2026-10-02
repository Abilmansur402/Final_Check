import * as React from 'react'
import {
  Baby,
  BedDouble,
  HeartPulse,
  MapPinned,
  TrendingUp,
  UsersRound,
} from 'lucide-react'
import { REGIONS, REGION_TRENDS, NATIONAL_2025, DATA_YEAR } from '@/data/regional'
import { cn } from '@/lib/utils'
import type { MetricKey } from '@/components/regional/RegionalMap'
import { KazakhstanChoropleth } from '@/components/regional/KazakhstanChoropleth'
import { RegionalTrendChart } from '@/components/regional/RegionalTrendChart'
import { formatMapValue, isCapacityMetric } from '@/lib/regionalMap'

const METRICS: {
  key: MetricKey
  label: string
  shortLabel: string
  icon: typeof Baby
}[] = [
  {
    key: 'hospitalBeds',
    label: 'Больничные койки',
    shortLabel: 'Койки',
    icon: BedDouble,
  },
  {
    key: 'nursingStaff',
    label: 'Средний медперсонал',
    shortLabel: 'Медперсонал',
    icon: UsersRound,
  },
  {
    key: 'infantMortalityPer1000',
    label: 'Младенческая смертность',
    shortLabel: 'Младенческая',
    icon: Baby,
  },
  {
    key: 'neonatalMortalityPer1000',
    label: 'Неонатальная смертность',
    shortLabel: 'Неонатальная',
    icon: HeartPulse,
  },
]

const integerFormatter = new Intl.NumberFormat('ru-KZ')

function nationalValue(metric: MetricKey) {
  return NATIONAL_2025[metric]
}

export function InteractiveMapPage() {
  const [metric, setMetric] = React.useState<MetricKey>('hospitalBeds')
  const [selected, setSelected] = React.useState('г. Алматы')

  const selectedRegion =
    REGIONS.find((region) => region.region === selected) ?? REGIONS[0]
  const rankedRegions = React.useMemo(
    () => [...REGIONS].sort((a, b) => b[metric] - a[metric]),
    [metric],
  )
  const rank = rankedRegions.findIndex((region) => region.region === selectedRegion.region) + 1
  const topRegions = rankedRegions.slice(0, 5)
  const currentMetric = METRICS.find((item) => item.key === metric) ?? METRICS[0]
  const national = nationalValue(metric)
  const relativeToNational =
    isCapacityMetric(metric)
      ? (selectedRegion[metric] / national) * 100
      : ((selectedRegion[metric] - national) / national) * 100

  return (
    <div className="space-y-5">
      <section className="flex flex-col gap-4 border-b pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm font-medium text-primary">
            <MapPinned className="h-4 w-4" />
            Казахстан • {DATA_YEAR}
          </div>
          <h2 className="text-2xl font-semibold">Карта здоровья детей</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Региональные показатели системы здравоохранения и детской смертности
          </p>
        </div>

        <div className="grid grid-cols-2 gap-1 rounded-md border bg-muted/60 p-1 sm:grid-cols-4">
          {METRICS.map((item) => {
            const Icon = item.icon
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => setMetric(item.key)}
                aria-pressed={metric === item.key}
                className={cn(
                  'flex min-h-10 items-center justify-center gap-2 rounded-sm px-3 text-xs font-medium transition-colors sm:text-sm',
                  metric === item.key
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="hidden xl:inline">{item.label}</span>
                <span className="xl:hidden">{item.shortLabel}</span>
              </button>
            )
          })}
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <section className="overflow-hidden rounded-md border bg-card">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3">
            <div>
              <h3 className="text-sm font-semibold">{currentMetric.label}</h3>
              <p className="text-xs text-muted-foreground">AshyqData, {DATA_YEAR}</p>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="h-2.5 w-2.5 rounded-sm bg-[#d6efe2]" />
              ниже
              <span className="ml-2 h-2.5 w-2.5 rounded-sm bg-[#c85b61]" />
              выше
            </div>
          </div>
          <KazakhstanChoropleth
            regions={REGIONS}
            metric={metric}
            selected={selectedRegion.region}
            onSelect={setSelected}
          />
        </section>

        <aside className="space-y-4">
          <section className="rounded-md border bg-card p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-medium uppercase text-muted-foreground">Регион</p>
                <h3 className="mt-1 text-lg font-semibold leading-tight">{selectedRegion.region}</h3>
              </div>
              <div className="rounded-md bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                #{rank} из {REGIONS.length}
              </div>
            </div>

            <div className="mt-5 border-b pb-5">
              <p className="text-sm text-muted-foreground">{currentMetric.label}</p>
              <p className="mt-1 text-3xl font-semibold tabular-nums">
                {formatMapValue(selectedRegion[metric], metric)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {isCapacityMetric(metric)
                  ? `${relativeToNational.toFixed(1)}% от значения по Казахстану`
                  : `${relativeToNational >= 0 ? '+' : ''}${relativeToNational.toFixed(1)}% к среднему по Казахстану`}
              </p>
            </div>

            <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-4 text-sm">
              <div>
                <dt className="text-xs text-muted-foreground">Койки</dt>
                <dd className="mt-1 font-semibold tabular-nums">
                  {integerFormatter.format(selectedRegion.hospitalBeds)}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Медперсонал</dt>
                <dd className="mt-1 font-semibold tabular-nums">
                  {integerFormatter.format(selectedRegion.nursingStaff)}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Младенческая</dt>
                <dd className="mt-1 font-semibold tabular-nums">
                  {selectedRegion.infantMortalityPer1000.toFixed(2)}‰
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Неонатальная</dt>
                <dd className="mt-1 font-semibold tabular-nums">
                  {selectedRegion.neonatalMortalityPer1000.toFixed(2)}‰
                </dd>
              </div>
            </dl>
          </section>

          <section className="rounded-md border bg-card p-4">
            <div className="mb-3 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold">Лидеры показателя</h3>
            </div>
            <div className="space-y-1">
              {topRegions.map((region, index) => (
                <button
                  key={region.region}
                  type="button"
                  onClick={() => setSelected(region.region)}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-sm px-2 py-2 text-left text-sm transition-colors hover:bg-muted',
                    selectedRegion.region === region.region && 'bg-primary/10',
                  )}
                >
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-sm bg-muted text-xs font-semibold">
                    {index + 1}
                  </span>
                  <span className="min-w-0 flex-1 truncate">{region.region}</span>
                  <span className="shrink-0 font-semibold tabular-nums">
                    {formatMapValue(region[metric], metric)}
                  </span>
                </button>
              ))}
            </div>
          </section>
        </aside>
      </div>

      <section className="rounded-md border bg-card p-4">
        <div className="mb-3">
          <h3 className="text-sm font-semibold">Динамика смертности • {selectedRegion.region}</h3>
          <p className="mt-1 text-xs text-muted-foreground">2020–2025, на 1000 живорождённых</p>
        </div>
        <RegionalTrendChart
          data={REGION_TRENDS[selectedRegion.region]}
          nationalAvg={NATIONAL_2025.infantMortalityPer1000}
          showComparison
          regionLabel={selectedRegion.region}
        />
      </section>

      <p className="text-xs text-muted-foreground">
        Источник показателей: AshyqData. Границы: OpenStreetMap, ArcGIS Open Data.
      </p>
    </div>
  )
}
