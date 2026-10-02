import * as React from 'react'
import { geoMercator, geoPath } from 'd3-geo'
import type { Feature, FeatureCollection, Geometry } from 'geojson'
import type { RegionMetric } from '@/types'
import type { MetricKey } from '@/components/regional/RegionalMap'
import { formatMapValue, isCapacityMetric } from '@/lib/regionalMap'

interface MapProperties {
  osm_id?: string
  name_en?: string
}

type MapFeature = Feature<Geometry, MapProperties>
type MapData = FeatureCollection<Geometry, MapProperties>

interface KazakhstanChoroplethProps {
  regions: RegionMetric[]
  metric: MetricKey
  selected: string
  onSelect: (region: string) => void
}

const OSM_REGION_NAMES: Record<string, string> = {
  '214834': 'Атырауская',
  '215441': 'Западно-Казахстанская',
  '215683': 'Актюбинская',
  '215686': 'Мангистауская',
  '215699': 'Восточно-Казахстанская',
  '215718': 'Алматинская',
  '215722': 'Жамбылская',
  '215727': 'Кызылординская',
  '215739': 'Туркестанская',
  '215743': 'Акмолинская',
  '215760': 'Северо-Казахстанская',
  '215772': 'Павлодарская',
  '215776': 'Карагандинская',
  '1288730': 'Костанайская',
  '2465058': 'г. Алматы',
  '3087155': 'г. Астана',
  '3389772': 'г. Шымкент',
  '14243026': 'Абай',
  '14312169': 'Жетісу',
  '14312737': 'Ұлытау',
}

const MORTALITY_COLORS = ['#d6efe2', '#9ed9c2', '#f1d27a', '#e99a62', '#c85b61']
const CAPACITY_COLORS = ['#dbeafe', '#a8d8ea', '#67c5c5', '#249e9a', '#0f6f70']

function regionName(feature: MapFeature) {
  const osmId = feature.properties?.osm_id
  return osmId ? OSM_REGION_NAMES[osmId] : undefined
}

export function KazakhstanChoropleth({
  regions,
  metric,
  selected,
  onSelect,
}: KazakhstanChoroplethProps) {
  const containerRef = React.useRef<HTMLDivElement>(null)
  const [mapData, setMapData] = React.useState<MapData | null>(null)
  const [loadError, setLoadError] = React.useState(false)
  const [hovered, setHovered] = React.useState<string | null>(null)
  const [tooltip, setTooltip] = React.useState<{
    x: number
    y: number
    region: RegionMetric
  } | null>(null)

  React.useEffect(() => {
    let active = true

    fetch('/data/kazakhstan-admin1.geojson')
      .then((response) => {
        if (!response.ok) throw new Error('Map data is unavailable')
        return response.json() as Promise<MapData>
      })
      .then((data) => {
        if (active) setMapData(data)
      })
      .catch(() => {
        if (active) setLoadError(true)
      })

    return () => {
      active = false
    }
  }, [])

  const regionByName = React.useMemo(
    () => new Map(regions.map((region) => [region.region, region])),
    [regions],
  )
  const values = regions.map((region) => region[metric])
  const min = Math.min(...values)
  const max = Math.max(...values)
  const palette = isCapacityMetric(metric) ? CAPACITY_COLORS : MORTALITY_COLORS

  const projection = React.useMemo(() => {
    if (!mapData) return null
    return geoMercator().fitExtent(
      [
        [34, 28],
        [966, 520],
      ],
      mapData,
    )
  }, [mapData])
  const path = React.useMemo(
    () => (projection ? geoPath(projection) : null),
    [projection],
  )

  const colorFor = React.useCallback(
    (value: number) => {
      const ratio = max === min ? 0.5 : (value - min) / (max - min)
      return palette[Math.min(4, Math.floor(ratio * 5))]
    },
    [max, min, palette],
  )

  const topRegions = React.useMemo(
    () => [...regions].sort((a, b) => b[metric] - a[metric]).slice(0, 4),
    [metric, regions],
  )

  const updateTooltip = (
    event: React.PointerEvent<SVGPathElement>,
    region: RegionMetric,
  ) => {
    const bounds = containerRef.current?.getBoundingClientRect()
    if (!bounds) return
    setTooltip({
      x: event.clientX - bounds.left,
      y: event.clientY - bounds.top,
      region,
    })
  }

  if (loadError) {
    return (
      <div className="flex min-h-[420px] items-center justify-center text-sm text-muted-foreground">
        Карта временно недоступна
      </div>
    )
  }

  if (!mapData || !path) {
    return (
      <div className="flex min-h-[420px] items-center justify-center text-sm text-muted-foreground">
        Загрузка карты…
      </div>
    )
  }

  return (
    <div ref={containerRef} className="relative w-full overflow-hidden bg-background">
      <svg
        viewBox="0 0 1000 570"
        className="block h-auto min-h-[390px] w-full"
        role="img"
        aria-label="Интерактивная карта регионов Казахстана"
      >
        <defs>
          <pattern id="map-grid" width="28" height="28" patternUnits="userSpaceOnUse">
            <path
              d="M 28 0 L 0 0 0 28"
              fill="none"
              stroke="hsl(var(--border))"
              strokeWidth="0.6"
              opacity="0.42"
            />
          </pattern>
        </defs>
        <rect width="1000" height="570" fill="url(#map-grid)" />

        <g>
          {mapData.features.map((feature) => {
            const name = regionName(feature)
            const region = name ? regionByName.get(name) : undefined
            if (!name || !region) return null

            const isSelected = selected === name
            const isHovered = hovered === name

            return (
              <path
                key={feature.properties?.osm_id ?? name}
                d={path(feature) ?? undefined}
                fill={colorFor(region[metric])}
                stroke={isSelected ? 'hsl(var(--foreground))' : '#ffffff'}
                strokeWidth={isSelected ? 3 : isHovered ? 2.2 : 1.25}
                vectorEffect="non-scaling-stroke"
                role="button"
                tabIndex={0}
                aria-label={`${name}: ${formatMapValue(region[metric], metric)}`}
                className="cursor-pointer outline-none transition-[fill,opacity] duration-150 focus-visible:opacity-70"
                onClick={() => onSelect(name)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    onSelect(name)
                  }
                }}
                onPointerEnter={(event) => {
                  setHovered(name)
                  updateTooltip(event, region)
                }}
                onPointerMove={(event) => updateTooltip(event, region)}
                onPointerLeave={() => {
                  setHovered(null)
                  setTooltip(null)
                }}
              />
            )
          })}
        </g>

        <g aria-hidden="true">
          {topRegions.map((region, index) => {
            const feature = mapData.features.find(
              (candidate) => regionName(candidate) === region.region,
            )
            if (!feature) return null
            const [x, y] = path.centroid(feature)
            if (!Number.isFinite(x) || !Number.isFinite(y)) return null

            return (
              <g key={region.region} transform={`translate(${x} ${y})`}>
                <circle
                  r={index === 0 ? 10 : 7}
                  fill="hsl(var(--foreground))"
                  stroke="white"
                  strokeWidth="2"
                  opacity="0.92"
                />
                <text
                  y="3.5"
                  textAnchor="middle"
                  fill="hsl(var(--background))"
                  fontSize={index === 0 ? 10 : 8}
                  fontWeight="700"
                >
                  {index + 1}
                </text>
              </g>
            )
          })}
        </g>
      </svg>

      <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between gap-4">
        <div className="rounded-md border bg-card/95 px-3 py-2 shadow-sm backdrop-blur">
          <div className="mb-1.5 flex w-44 overflow-hidden rounded-sm">
            {palette.map((color) => (
              <span key={color} className="h-2 flex-1" style={{ backgroundColor: color }} />
            ))}
          </div>
          <div className="flex justify-between text-[10px] font-medium text-muted-foreground">
            <span>{formatMapValue(min, metric)}</span>
            <span>{formatMapValue(max, metric)}</span>
          </div>
        </div>
        <div className="hidden rounded-md border bg-card/95 px-3 py-2 text-[11px] text-muted-foreground shadow-sm backdrop-blur sm:block">
          <span className="font-semibold text-foreground">1–4</span> лидеры показателя
        </div>
      </div>

      {tooltip && (
        <div
          className="pointer-events-none absolute z-20 min-w-44 rounded-md border bg-popover px-3 py-2 text-xs shadow-lg"
          style={{
            left: tooltip.x,
            top: Math.max(8, tooltip.y - 12),
            transform: `${
              tooltip.x > (containerRef.current?.clientWidth ?? 0) / 2
                ? 'translateX(-100%)'
                : 'translateX(0)'
            } translateY(-100%)`,
          }}
        >
          <p className="font-semibold text-foreground">{tooltip.region.region}</p>
          <p className="mt-1 tabular-nums text-muted-foreground">
            {formatMapValue(tooltip.region[metric], metric)}
          </p>
        </div>
      )}
    </div>
  )
}
