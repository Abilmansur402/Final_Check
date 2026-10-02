import { Link } from 'react-router-dom'
import { Baby, ChevronRight } from 'lucide-react'
import type { Patient, PatientStatus } from '@/types'
import { Badge } from '@/components/ui/badge'
import { RiskIndicator } from './RiskIndicator'
import { cn } from '@/lib/utils'

const STATUS: Record<PatientStatus, { label: string; className: string }> = {
  stable: { label: 'Стабилен', className: 'bg-risk-low/15 text-risk-low' },
  watch: {
    label: 'Наблюдение',
    className: 'bg-risk-moderate/15 text-risk-moderate',
  },
  critical: {
    label: 'Критический',
    className: 'bg-risk-high/15 text-risk-high',
  },
}

interface PatientCardProps {
  patient: Patient
  selected?: boolean
  onSelect?: (id: string) => void
  href?: string
}

export function PatientCard({
  patient,
  selected,
  onSelect,
  href,
}: PatientCardProps) {
  const status = STATUS[patient.status]

  const body = (
    <div
      className={cn(
        'grid grid-cols-[40px_minmax(0,1fr)] items-center gap-x-3 gap-y-2.5 rounded-lg border bg-card p-3 text-left transition-all hover:border-primary/40 hover:shadow-sm',
        selected && 'border-primary/60 ring-1 ring-primary/30',
      )}
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground">
        <Baby className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <p className="text-sm font-semibold leading-tight">{patient.name}</p>
          <Badge
            variant="secondary"
            className={cn('shrink-0', status.className)}
          >
            {status.label}
          </Badge>
        </div>
        <p className="mt-1 truncate text-xs text-muted-foreground">
          {patient.id} · {patient.bed}
        </p>
        <p className="mt-0.5 flex flex-wrap gap-x-1.5 text-xs leading-5 text-muted-foreground">
          <span className="whitespace-nowrap tabular-nums">
            {patient.gestationalAgeWeeks} нед
          </span>
          <span aria-hidden="true">·</span>
          <span className="whitespace-nowrap tabular-nums">
            {patient.birthWeightGrams} г
          </span>
          <span aria-hidden="true">·</span>
          <span className="whitespace-nowrap tabular-nums">
            {patient.dayOfLife}-е сутки
          </span>
        </p>
      </div>
      <div className="col-span-2 flex items-center gap-2">
        <RiskIndicator
          score={patient.riskScore}
          delta={patient.riskDelta}
          size="sm"
          className="flex-1 justify-between"
        />
        {href && (
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
        )}
      </div>
    </div>
  )

  if (href) {
    return (
      <Link to={href} className="block">
        {body}
      </Link>
    )
  }

  return (
    <button className="block w-full" onClick={() => onSelect?.(patient.id)}>
      {body}
    </button>
  )
}
