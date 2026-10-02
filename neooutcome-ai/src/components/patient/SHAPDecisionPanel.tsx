import * as React from 'react'
import { ArrowDownRight, ArrowUpRight, Info, Sigma } from 'lucide-react'
import type { PatientPrediction } from '@/lib/patientImport'
import { cn } from '@/lib/utils'

interface SHAPDecisionPanelProps {
  prediction: PatientPrediction
}

const RISK_LABELS: Record<PatientPrediction['risk_band'], string> = {
  low: 'низкий',
  moderate: 'умеренный',
  elevated: 'повышенный',
  high: 'высокий',
}

function signed(value: number, digits = 3) {
  return `${value >= 0 ? '+' : ''}${value.toFixed(digits)}`
}

function percentage(value: number | undefined) {
  return value === undefined ? '—' : `${(value * 100).toFixed(1)}%`
}

export function SHAPDecisionPanel({ prediction }: SHAPDecisionPanelProps) {
  const factors = prediction.shap_values ?? prediction.top_factors
  const visibleFactors = factors.slice(0, 6)
  const [selectedFeature, setSelectedFeature] = React.useState(visibleFactors[0]?.feature)
  const selected = visibleFactors.find((factor) => factor.feature === selectedFeature) ?? visibleFactors[0]
  const maxContribution = Math.max(0.001, ...visibleFactors.map((factor) => Math.abs(factor.contribution)))
  const baseProbability = prediction.shap_base_probability
  const contributionSum = prediction.shap_contribution_sum
  const margin = prediction.shap_margin

  if (!selected) return null

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Sigma className="h-4 w-4 text-primary" />
            Как модель сформировала вердикт
          </div>
          <p className="mt-1 max-w-3xl text-xs leading-relaxed text-muted-foreground">
            SHAP раскладывает итоговый score на базовый уровень и вклады признаков. Положительный вклад повышает риск, отрицательный снижает его.
          </p>
        </div>
        <span className="inline-flex w-fit items-center gap-1.5 rounded-md border bg-background px-2.5 py-1.5 text-[11px] text-muted-foreground">
          <Info className="h-3.5 w-3.5" />
          TreeSHAP / log-odds
        </span>
      </div>

      <div className="grid gap-2 sm:grid-cols-3">
        <div className="rounded-md border bg-background p-3">
          <p className="text-[11px] text-muted-foreground">Базовый уровень</p>
          <p className="mt-1 text-lg font-semibold tabular-nums">{percentage(baseProbability)}</p>
          <p className="mt-1 text-[11px] text-muted-foreground">до учёта признаков</p>
        </div>
        <div className="rounded-md border bg-background p-3">
          <p className="text-[11px] text-muted-foreground">Сумма SHAP-вкладов</p>
          <p className="mt-1 text-lg font-semibold tabular-nums">{contributionSum === undefined ? '—' : signed(contributionSum)}</p>
          <p className="mt-1 text-[11px] text-muted-foreground">из {prediction.shap_feature_count ?? factors.length} признаков</p>
        </div>
        <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
          <p className="text-[11px] text-muted-foreground">Итоговый вердикт</p>
          <p className="mt-1 text-lg font-semibold tabular-nums">{prediction.risk_percent.toFixed(1)}%</p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {RISK_LABELS[prediction.risk_band]} · {prediction.threshold_crossed ? 'порог превышен' : 'ниже порога'}
          </p>
        </div>
      </div>

      <div className="rounded-md border bg-background p-3">
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">Вероятность = sigmoid(</span>
          <span>база {baseProbability === undefined ? '—' : baseProbability.toFixed(3)}</span>
          <span>+ Σ SHAP</span>
          <span className="font-medium text-foreground">) = {prediction.risk_percent.toFixed(1)}%</span>
        </div>
        {margin !== undefined && (
          <p className="mt-1 text-[11px] text-muted-foreground">
            Суммарный margin модели: {signed(margin, 4)}. SHAP-значения не являются процентными пунктами: процент получается после sigmoid-преобразования.
          </p>
        )}
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between gap-3">
          <p className="text-xs font-semibold">Наиболее влиятельные признаки</p>
          <p className="text-[11px] text-muted-foreground">Показаны {visibleFactors.length} из {prediction.shap_feature_count ?? factors.length}</p>
        </div>
        <div className="space-y-2">
          {visibleFactors.map((factor) => {
            const positive = factor.contribution >= 0
            const active = factor.feature === selected.feature
            return (
              <button
                key={factor.feature}
                type="button"
                onClick={() => setSelectedFeature(factor.feature)}
                className={cn(
                  'grid w-full grid-cols-[minmax(0,1fr)_minmax(100px,1.6fr)_60px] items-center gap-3 rounded-md border px-3 py-2 text-left transition-colors',
                  active ? 'border-primary/40 bg-primary/5' : 'border-transparent hover:border-border hover:bg-muted/50',
                )}
              >
                <span className="truncate text-xs font-medium">{factor.label}</span>
                <span className="relative h-2 overflow-hidden rounded-sm bg-muted">
                  <span
                    className={cn('absolute inset-y-0 left-0 rounded-sm', positive ? 'bg-risk-high' : 'bg-primary')}
                    style={{ width: `${Math.max(8, (Math.abs(factor.contribution) / maxContribution) * 100)}%` }}
                  />
                </span>
                <span className={cn('flex items-center justify-end gap-1 text-xs font-semibold tabular-nums', positive ? 'text-risk-high' : 'text-primary')}>
                  {positive ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
                  {signed(factor.contribution)}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="rounded-md border border-primary/20 bg-primary/5 p-3 text-xs">
        <p className="font-semibold">Выбранный фактор: {selected.label}</p>
        <p className="mt-1 text-muted-foreground">
          Значение: <span className="font-medium text-foreground">{selected.value ?? 'нет данных'} {selected.unit}</span> · вклад {signed(selected.contribution)} log-odds, который {selected.direction === 'raises' ? 'повышает' : 'снижает'} итоговый score.
        </p>
      </div>

      <p className="text-[11px] leading-relaxed text-muted-foreground">
        Объяснение показывает связь признаков с прогнозом этой модели и не доказывает причинность. Решение принимает врач после проверки первичной документации.
      </p>
    </div>
  )
}
