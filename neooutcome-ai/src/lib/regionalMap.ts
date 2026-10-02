import type { MetricKey } from '@/components/regional/RegionalMap'

const integerFormatter = new Intl.NumberFormat('ru-KZ')

export function isCapacityMetric(metric: MetricKey) {
  return metric === 'hospitalBeds' || metric === 'nursingStaff'
}

export function formatMapValue(value: number, metric: MetricKey) {
  return isCapacityMetric(metric)
    ? integerFormatter.format(value)
    : `${value.toFixed(2)}‰`
}
