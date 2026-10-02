import { TrendingDown, TrendingUp, Minus } from 'lucide-react'
import { getRiskDescriptor } from '@/lib/risk'
import { cn } from '@/lib/utils'

interface RiskIndicatorProps {
  score: number
  delta?: number
  size?: 'sm' | 'md'
  className?: string
}

/**
 * RiskIndicator — a highly legible, compact widget for the 24h risk score.
 * Uses the non-alarming clinical gradient and tabular numerals for fast reading.
 */
export function RiskIndicator({
  score,
  delta = 0,
  size = 'md',
  className,
}: RiskIndicatorProps) {
  const d = getRiskDescriptor(score)
  const DeltaIcon = delta > 0 ? TrendingUp : delta < 0 ? TrendingDown : Minus

  return (
    <div
      className={cn(
        'inline-flex items-center gap-3 rounded-lg px-3 py-2 leading-none ring-1',
        d.bgClass,
        d.ringClass,
        className,
      )}
    >
      <div className="flex items-baseline gap-1">
        <span
          className={cn(
            'font-bold tabular-nums',
            d.textClass,
            size === 'md' ? 'text-3xl' : 'text-xl',
          )}
        >
          {Math.round(score)}
        </span>
        <span className={cn('text-sm font-medium', d.textClass)}>%</span>
      </div>
      <div className="flex flex-col gap-1 text-right">
        <span
          className={cn(
            'whitespace-nowrap text-xs font-semibold uppercase',
            d.textClass,
          )}
        >
          {d.label} риск
        </span>
        <span className="flex items-center justify-end gap-0.5 whitespace-nowrap text-xs tabular-nums text-muted-foreground">
          <DeltaIcon className="h-3 w-3" />
          {delta === 0
            ? 'без изменений'
            : `${delta > 0 ? '+' : ''}${delta} п. за 6 ч`}
        </span>
      </div>
    </div>
  )
}
