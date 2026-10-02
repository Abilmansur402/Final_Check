import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { RegionTrendPoint } from '@/types'

interface RegionalTrendChartProps {
  data: RegionTrendPoint[]
  nationalAvg: number
  showComparison: boolean
  regionLabel: string
}

export function RegionalTrendChart({
  data,
  nationalAvg,
  showComparison,
  regionLabel,
}: RegionalTrendChartProps) {
  const withAvg = data.map((point) => ({
    ...point,
    nationalInfantAvg: nationalAvg,
  }))

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={withAvg}
          margin={{ top: 8, right: 8, bottom: 0, left: -18 }}
        >
          <defs>
            <linearGradient id="infantFill" x1="0" y1="0" x2="0" y2="1">
              <stop
                offset="0%"
                stopColor="hsl(var(--primary))"
                stopOpacity={0.28}
              />
              <stop
                offset="100%"
                stopColor="hsl(var(--primary))"
                stopOpacity={0}
              />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis
            dataKey="year"
            tick={{ fontSize: 12 }}
            stroke="hsl(var(--muted-foreground))"
          />
          <YAxis
            tick={{ fontSize: 12 }}
            stroke="hsl(var(--muted-foreground))"
            unit="‰"
          />
          <Tooltip
            formatter={(value: number) => [`${value.toFixed(2)}‰`, '']}
            contentStyle={{
              background: 'hsl(var(--popover))',
              border: '1px solid hsl(var(--border))',
              borderRadius: 8,
              fontSize: 12,
            }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Area
            type="monotone"
            dataKey="infantMortalityPer1000"
            name={`${regionLabel}: infant`}
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            fill="url(#infantFill)"
          />
          <Line
            type="monotone"
            dataKey="neonatalMortalityPer1000"
            name={`${regionLabel}: neonatal`}
            stroke="hsl(var(--risk-elevated))"
            strokeWidth={2}
            dot={{ r: 3 }}
          />
          {showComparison && (
            <Line
              type="monotone"
              dataKey="nationalInfantAvg"
              name="Kazakhstan infant avg, 2025"
              stroke="hsl(var(--risk-high))"
              strokeWidth={2}
              strokeDasharray="5 4"
              dot={false}
            />
          )}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
