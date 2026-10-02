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
import { RegionalMap, type MetricKey } from '@/components/regional/RegionalMap'
import { RegionMultiSelect } from '@/components/regional/RegionMultiSelect'
import { RegionTable } from '@/components/regional/RegionTable'
import { RegionalTrendChart } from '@/components/regional/RegionalTrendChart'

const METRIC_OPTIONS: { value: MetricKey; label: string }[] = [
  { value: 'infantMortalityPer1000', label: 'Младенческая смертность' },
  { value: 'neonatalMortalityPer1000', label: 'Неонатальная смертность' },
  { value: 'hospitalBeds', label: 'Больничные койки' },
  { value: 'nursingStaff', label: 'Средний медперсонал' },
]

const ALL_REGIONS = REGIONS.map((region) => region.region)
const integerFormatter = new Intl.NumberFormat('ru-KZ')

function average(values: number[]) {
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

export function RegionalDashboard() {
  const [metric, setMetric] = React.useState<MetricKey>(
    'infantMortalityPer1000',
  )
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
          label="Младенческая смертность (среднее)"
          value={`${avgInfantMortality.toFixed(2)}‰`}
          hint={`По Казахстану: ${NATIONAL_2025.infantMortalityPer1000.toFixed(2)}‰`}
          accentClass="text-risk-high bg-risk-high/10"
        />
        <StatCard
          icon={HeartPulse}
          label="Неонатальная смертность (среднее)"
          value={`${avgNeonatalMortality.toFixed(2)}‰`}
          hint={`По Казахстану: ${NATIONAL_2025.neonatalMortalityPer1000.toFixed(2)}‰`}
          accentClass="text-risk-elevated bg-risk-elevated/10"
        />
        <StatCard
          icon={BedDouble}
          label="Больничные койки"
          value={integerFormatter.format(totalBeds)}
          hint="В выбранных регионах"
        />
        <StatCard
          icon={UsersRound}
          label="Средний медперсонал"
          value={integerFormatter.format(totalNursingStaff)}
          hint={`Регионов выше среднего по смертности: ${hotspotCount}`}
          accentClass="text-primary bg-primary/10"
        />
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Карта детского здоровья Казахстана</CardTitle>
          <CardDescription>
            Показатели смертности на 1000 живорождённых и ресурсы
            здравоохранения по регионам.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="map">
            <TabsList>
              <TabsTrigger value="map">Карта</TabsTrigger>
              <TabsTrigger value="table">Таблица</TabsTrigger>
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
            <CardTitle>Динамика смертности — {selectedRegion.region}</CardTitle>
            <CardDescription>
              Младенческая и неонатальная смертность, 2020–2025.
            </CardDescription>
          </div>
          <Tabs
            value={showComparison ? 'compare' : 'region'}
            onValueChange={(value) => setShowComparison(value === 'compare')}
          >
            <TabsList>
              <TabsTrigger value="region">Регион</TabsTrigger>
              <TabsTrigger value="compare">Сравнить с РК</TabsTrigger>
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
          <CardTitle>Как это связано с ML-моделью</CardTitle>
          <CardDescription>
            Региональный слой — это мониторинг на уровне населения. Карточки
            пациентов используют ML-модели NeoOutcome для индивидуальной оценки
            риска.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm text-muted-foreground md:grid-cols-3">
          <div className="rounded-lg border bg-background p-3">
            <p className="font-medium text-foreground">
              PICDB и Асфендиярова / ML
            </p>
            <p>
              Обучение моделей на данных пациентов и индивидуальный риск в
              ОРИТН.
            </p>
          </div>
          <div className="rounded-lg border bg-background p-3">
            <p className="font-medium text-foreground">AshyqData / карта</p>
            <p>Региональные показатели смертности и ресурсов Казахстана.</p>
          </div>
          <div className="rounded-lg border bg-background p-3">
            <p className="font-medium text-foreground">Работа в больнице</p>
            <p>Врачи входят в систему по учётной записи.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
