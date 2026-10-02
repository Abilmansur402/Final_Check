import * as React from 'react'
import { Baby, BedDouble, HeartPulse, UsersRound } from 'lucide-react'
import {
  DATA_YEAR,
  NATIONAL_2025,
  REGIONS,
  REGION_TRENDS,
} from '@/data/regional'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { StatCard } from '@/components/dashboard/StatCard'
import {
  RegionalMap,
  type MetricKey,
} from '@/components/regional/RegionalMap'
import { RegionMultiSelect } from '@/components/regional/RegionMultiSelect'
import { RegionTable } from '@/components/regional/RegionTable'
import { RegionalTrendChart } from '@/components/regional/RegionalTrendChart'

const METRIC_OPTIONS: { value: MetricKey; label: string }[] = [
  { value: 'infantMortalityPer1000', label: 'Infant mortality' },
  { value: 'neonatalMortalityPer1000', label: 'Neonatal mortality' },
  { value: 'hospitalBeds', label: 'Hospital beds' },
  { value: 'nursingStaff', label: 'Nursing staff' },
]

const ALL_REGIONS = REGIONS.map((region) => region.region)
const integerFormatter = new Intl.NumberFormat('ru-KZ')

function average(values: number[]) {
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

export function RegionalDashboard() {
  const [metric, setMetric] =
    React.useState<MetricKey>('infantMortalityPer1000')
  const [regionFilter, setRegionFilter] = React.useState<string[]>([])
  const [selected, setSelected] = React.useState<string>('Кызылординская')
  const [showComparison, setShowComparison] = React.useState(true)

  const visibleRegions =
    regionFilter.length === 0
      ? REGIONS
      : REGIONS.filter((region) => regionFilter.includes(region.region))

  React.useEffect(() => {
    if (!visibleRegions.some((region) => region.region === selected)) {
      setSelected(visibleRegions[0]?.region ?? REGIONS[0].region)
    }
  }, [visibleRegions, selected])

  const selectedRegion =
    REGIONS.find((region) => region.region === selected) ?? REGIONS[0]

  const avgInfantMortality = average(
    visibleRegions.map((region) => region.infantMortalityPer1000),
  )
  const avgNeonatalMortality = average(
    visibleRegions.map((region) => region.neonatalMortalityPer1000),
  )
  const totalBeds = visibleRegions.reduce(
    (sum, region) => sum + region.hospitalBeds,
    0,
  )
  const totalNursingStaff = visibleRegions.reduce(
    (sum, region) => sum + region.nursingStaff,
    0,
  )
  const hotspotCount = visibleRegions.filter(
    (region) =>
      region.infantMortalityPer1000 > NATIONAL_2025.infantMortalityPer1000,
  ).length

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <RegionMultiSelect
          options={ALL_REGIONS}
          selected={regionFilter}
          onChange={setRegionFilter}
        />
        <Select
          value={metric}
          onValueChange={(value) => setMetric(value as MetricKey)}
        >
          <SelectTrigger className="w-60">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {METRIC_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="rounded-md border bg-card px-3 py-2 text-sm text-muted-foreground">
          AshyqData, {DATA_YEAR}
        </div>
      </div>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={Baby}
          label="Avg infant mortality"
          value={`${avgInfantMortality.toFixed(2)}‰`}
          hint={`Kazakhstan: ${NATIONAL_2025.infantMortalityPer1000.toFixed(2)}‰`}
          accentClass="text-risk-high bg-risk-high/10"
        />
        <StatCard
          icon={HeartPulse}
          label="Avg neonatal mortality"
          value={`${avgNeonatalMortality.toFixed(2)}‰`}
          hint={`Kazakhstan: ${NATIONAL_2025.neonatalMortalityPer1000.toFixed(2)}‰`}
          accentClass="text-risk-elevated bg-risk-elevated/10"
        />
        <StatCard
          icon={BedDouble}
          label="Hospital beds"
          value={integerFormatter.format(totalBeds)}
          hint="Selected regions"
        />
        <StatCard
          icon={UsersRound}
          label="Nursing staff"
          value={integerFormatter.format(totalNursingStaff)}
          hint={`${hotspotCount} infant mortality hotspots`}
          accentClass="text-primary bg-primary/10"
        />
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Kazakhstan child health map</CardTitle>
          <CardDescription>
            Regional public-health layer: mortality indicators per 1000 live
            births plus healthcare capacity indicators.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="map">
            <TabsList>
              <TabsTrigger value="map">Map</TabsTrigger>
              <TabsTrigger value="table">Table</TabsTrigger>
            </TabsList>
            <TabsContent value="map">
              <RegionalMap
                regions={visibleRegions}
                metric={metric}
                selected={selected}
                onSelect={setSelected}
              />
            </TabsContent>
            <TabsContent value="table">
              <RegionTable
                regions={visibleRegions}
                selected={selected}
                onSelect={setSelected}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-start justify-between space-y-0">
          <div>
            <CardTitle>Mortality trend — {selectedRegion.region}</CardTitle>
            <CardDescription>
              Infant and neonatal mortality, 2020–2025.
            </CardDescription>
          </div>
          <Tabs
            value={showComparison ? 'compare' : 'region'}
            onValueChange={(value) => setShowComparison(value === 'compare')}
          >
            <TabsList>
              <TabsTrigger value="region">Region</TabsTrigger>
              <TabsTrigger value="compare">vs Kazakhstan</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent>
          <RegionalTrendChart
            data={REGION_TRENDS[selectedRegion.region]}
            nationalAvg={NATIONAL_2025.infantMortalityPer1000}
            showComparison={showComparison}
            regionLabel={selectedRegion.region}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>How this connects to the ML layer</CardTitle>
          <CardDescription>
            The regional layer is population-level monitoring. The patient
            command center uses the NeoOutcome ML feature mart for individual
            risk scoring.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm text-muted-foreground md:grid-cols-3">
          <div className="rounded-lg border bg-background p-3">
            <p className="font-medium text-foreground">PICDB / ML</p>
            <p>Patient-level model training and individual NICU risk scores.</p>
          </div>
          <div className="rounded-lg border bg-background p-3">
            <p className="font-medium text-foreground">AshyqData / map</p>
            <p>Regional mortality and capacity indicators for Kazakhstan.</p>
          </div>
          <div className="rounded-lg border bg-background p-3">
            <p className="font-medium text-foreground">Hospital workflow</p>
            <p>Doctors enter through authentication before using dashboards.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
