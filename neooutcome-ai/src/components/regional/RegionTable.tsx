import { NATIONAL_2025 } from '@/data/regional'
import type { RegionMetric } from '@/types'
import { cn } from '@/lib/utils'

interface RegionTableProps {
  regions: RegionMetric[]
  selected: string | null
  onSelect: (region: string) => void
}

const integerFormatter = new Intl.NumberFormat('ru-KZ')

export function RegionTable({
  regions,
  selected,
  onSelect,
}: RegionTableProps) {
  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/50 text-left text-xs text-muted-foreground">
            <th className="px-3 py-2 font-medium">Region</th>
            <th className="px-3 py-2 text-right font-medium">
              Infant mortality
            </th>
            <th className="px-3 py-2 text-right font-medium">
              Neonatal mortality
            </th>
            <th className="px-3 py-2 text-right font-medium">Beds</th>
            <th className="px-3 py-2 text-right font-medium">
              Nursing staff
            </th>
          </tr>
        </thead>
        <tbody>
          {regions.map((region) => {
            const aboveNational =
              region.infantMortalityPer1000 >
              NATIONAL_2025.infantMortalityPer1000

            return (
              <tr
                key={region.region}
                onClick={() => onSelect(region.region)}
                className={cn(
                  'cursor-pointer border-b last:border-0 transition-colors hover:bg-muted/40',
                  selected === region.region && 'bg-accent/50',
                )}
              >
                <td className="px-3 py-2">
                  <div className="font-medium">{region.region}</div>
                  <div className="text-xs text-muted-foreground">
                    {region.source}
                  </div>
                </td>
                <td
                  className={cn(
                    'px-3 py-2 text-right font-medium tabular-nums',
                    aboveNational ? 'text-risk-high' : 'text-risk-low',
                  )}
                >
                  {region.infantMortalityPer1000.toFixed(2)}‰
                </td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {region.neonatalMortalityPer1000.toFixed(2)}‰
                </td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {integerFormatter.format(region.hospitalBeds)}
                </td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {integerFormatter.format(region.nursingStaff)}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
