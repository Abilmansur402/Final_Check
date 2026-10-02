export type RiskBand = 'low' | 'moderate' | 'elevated' | 'high'

export type PatientStatus = 'stable' | 'watch' | 'critical'

export interface Vitals {
  heartRate: number // bpm
  spo2: number // %
  temperature: number // °C
  respiratoryRate: number // breaths/min
  meanBloodPressure: number // mmHg
}

export interface VitalTrendPoint {
  t: string // ISO-ish label
  heartRate: number
  spo2: number
  temperature: number
}

export interface ShapFeature {
  feature: string
  label: string
  contribution: number // signed contribution to risk (percentage points)
  value: string // human-readable current value
  insight: string // clinical insight shown on interaction
}

export interface Patient {
  id: string
  name: string
  bed: string
  gestationalAgeWeeks: number
  birthWeightGrams: number
  dayOfLife: number
  status: PatientStatus
  riskScore: number // 24h predicted adverse-outcome probability (0-100)
  riskDelta: number // change vs previous assessment (percentage points)
  lastUpdated: string
  vitals: Vitals
  vitalHistory: VitalTrendPoint[]
  shap: ShapFeature[]
  baselineRisk: number // model base value (0-100)
}

export interface RegionMetric {
  region: string
  source: string
  infantMortalityPer1000: number
  neonatalMortalityPer1000: number
  hospitalBeds: number
  nursingStaff: number
  dataYear: number
}

export interface RegionTrendPoint {
  year: string
  infantMortalityPer1000: number
  neonatalMortalityPer1000: number
}
