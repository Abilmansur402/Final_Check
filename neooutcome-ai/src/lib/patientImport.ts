export const MODEL_FEATURES = [
  'gender',
  'age_days_at_admission',
  'hr_mean',
  'hr_min',
  'hr_max',
  'rr_mean',
  'rr_min',
  'rr_max',
  'temp_mean',
  'temp_max',
  'sbp_mean',
  'vitals_count_12h',
  'ph_mean',
  'ph_min',
  'lactate_mean',
  'lactate_max',
  'po2_mean',
  'po2_min',
  'pco2_mean',
  'base_excess_mean',
  'base_excess_min',
  'glucose_mean',
  'glucose_min',
  'glucose_max',
  'hemoglobin_mean',
  'platelets_min',
  'wbc_mean',
  'wbc_max',
  'sodium_mean',
  'potassium_mean',
  'labs_count_12h',
] as const

export type ModelFeature = (typeof MODEL_FEATURES)[number]
export type FeatureRecord = Record<ModelFeature, number | null>

export interface PatientPredictionFactor {
  feature: string
  label: string
  value: number | null
  unit: string
  contribution: number
  direction: 'raises' | 'lowers'
}

export interface PatientPrediction {
  model_name: string
  model_version: string
  prediction_window_hours: number
  risk_probability: number
  risk_percent: number
  operating_threshold: number
  threshold_crossed: boolean
  risk_band: 'low' | 'moderate' | 'elevated' | 'high'
  top_factors: PatientPredictionFactor[]
  shap_values?: PatientPredictionFactor[]
  shap_method?: string
  shap_feature_count?: number
  shap_base_value?: number
  shap_base_probability?: number
  shap_contribution_sum?: number
  shap_margin?: number
  shap_probability?: number
  review_actions: string[]
  disclaimer: string
  generated_at: string
}

export interface PatientBundle {
  schema_version: string
  synthetic: boolean
  patient: {
    patient_id: string
    full_name: string
    sex: string
    date_of_birth: string
    gestational_age?: string
    birth_weight_g?: number
    current_weight_g?: number
    blood_group?: string
  }
  encounter: {
    encounter_id: string
    institution: string
    department: string
    admitted_at: string
    prediction_time: string
    admission_diagnosis: string
    attending_clinician?: string
  }
  features: FeatureRecord
  prediction?: PatientPrediction
}

function parseCsvRow(row: string) {
  const values: string[] = []
  let current = ''
  let quoted = false

  for (let index = 0; index < row.length; index += 1) {
    const character = row[index]
    const next = row[index + 1]
    if (character === '"' && quoted && next === '"') {
      current += '"'
      index += 1
    } else if (character === '"') {
      quoted = !quoted
    } else if (character === ',' && !quoted) {
      values.push(current.trim())
      current = ''
    } else {
      current += character
    }
  }
  values.push(current.trim())
  return values
}

function normalizeFeatures(input: Record<string, unknown>): FeatureRecord {
  const missing = MODEL_FEATURES.filter((feature) => !(feature in input))
  if (missing.length > 0) {
    throw new Error(`Не хватает признаков модели: ${missing.join(', ')}`)
  }

  return Object.fromEntries(
    MODEL_FEATURES.map((feature) => {
      const rawValue = input[feature]
      if (rawValue === null || rawValue === undefined || rawValue === '') {
        return [feature, null]
      }
      if (feature === 'gender' && typeof rawValue === 'string') {
        const normalized = rawValue.trim().toUpperCase()
        if (normalized === 'M') return [feature, 1]
        if (normalized === 'F') return [feature, 0]
      }
      const value = Number(rawValue)
      if (!Number.isFinite(value)) {
        throw new Error(`Признак ${feature} должен быть числом`)
      }
      return [feature, value]
    }),
  ) as FeatureRecord
}

function importedBundle(features: FeatureRecord): PatientBundle {
  const now = new Date()
  const predictionTime = new Date(now.getTime() + 12 * 60 * 60 * 1000)
  return {
    schema_version: '1.0',
    synthetic: true,
    patient: {
      patient_id: `IMPORT-${now.getTime().toString().slice(-6)}`,
      full_name: 'Импортированный демо-пациент',
      sex: features.gender === 1 ? 'M' : 'F',
      date_of_birth: 'не указана',
    },
    encounter: {
      encounter_id: `IMPORT-HADM-${now.getTime().toString().slice(-6)}`,
      institution: 'Текущее медицинское учреждение',
      department: 'NICU',
      admitted_at: now.toISOString(),
      prediction_time: predictionTime.toISOString(),
      admission_diagnosis: 'Импорт из машинного файла',
    },
    features,
  }
}

export function parsePatientCsv(text: string): PatientBundle {
  const rows = text
    .trim()
    .split(/\r?\n/)
    .filter((row) => row.trim().length > 0)
  if (rows.length < 2) {
    throw new Error('CSV должен содержать строку заголовков и одну строку пациента')
  }

  const headers = parseCsvRow(rows[0]).map((header, index) =>
    index === 0 ? header.replace(/^\uFEFF/, '') : header,
  )
  const values = parseCsvRow(rows[1])
  if (headers.length !== values.length) {
    throw new Error('Количество значений CSV не совпадает с количеством заголовков')
  }

  const record = Object.fromEntries(
    headers.map((header, index) => [header, values[index]]),
  )
  return importedBundle(normalizeFeatures(record))
}

export function parsePatientJson(value: unknown): PatientBundle {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('JSON должен содержать объект пациента или объект признаков')
  }

  const record = value as Record<string, unknown>
  if ('features' in record && record.features && typeof record.features === 'object') {
    const features = normalizeFeatures(record.features as Record<string, unknown>)
    if ('patient' in record && 'encounter' in record) {
      return { ...(record as unknown as PatientBundle), features }
    }
    return importedBundle(features)
  }

  return importedBundle(normalizeFeatures(record))
}
