import type { RiskBand } from '@/types'

export interface RiskDescriptor {
  band: RiskBand
  label: string
  colorVar: string // hsl var reference
  textClass: string
  bgClass: string
  ringClass: string
}

export function getRiskBand(score: number): RiskBand {
  if (score < 25) return 'low'
  if (score < 50) return 'moderate'
  if (score < 75) return 'elevated'
  return 'high'
}

const DESCRIPTORS: Record<RiskBand, RiskDescriptor> = {
  low: {
    band: 'low',
    label: 'Низкий',
    colorVar: 'hsl(var(--risk-low))',
    textClass: 'text-risk-low',
    bgClass: 'bg-risk-low/12',
    ringClass: 'ring-risk-low/30',
  },
  moderate: {
    band: 'moderate',
    label: 'Умеренный',
    colorVar: 'hsl(var(--risk-moderate))',
    textClass: 'text-risk-moderate',
    bgClass: 'bg-risk-moderate/12',
    ringClass: 'ring-risk-moderate/30',
  },
  elevated: {
    band: 'elevated',
    label: 'Повышенный',
    colorVar: 'hsl(var(--risk-elevated))',
    textClass: 'text-risk-elevated',
    bgClass: 'bg-risk-elevated/12',
    ringClass: 'ring-risk-elevated/30',
  },
  high: {
    band: 'high',
    label: 'Высокий',
    colorVar: 'hsl(var(--risk-high))',
    textClass: 'text-risk-high',
    bgClass: 'bg-risk-high/12',
    ringClass: 'ring-risk-high/30',
  },
}

export function getRiskDescriptor(score: number): RiskDescriptor {
  return DESCRIPTORS[getRiskBand(score)]
}

export function riskColor(score: number): string {
  return DESCRIPTORS[getRiskBand(score)].colorVar
}
