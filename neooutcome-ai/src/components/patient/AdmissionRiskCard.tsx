import * as React from "react";
import {
  Activity,
  AlertTriangle,
  Baby,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const ML_API_URL = import.meta.env.VITE_ML_API_URL ?? "http://127.0.0.1:8000";

type Band = "low" | "moderate" | "elevated" | "high";

interface AdmissionFactor {
  feature: string;
  label: string;
  value: number | null;
  unit: string;
  contribution: number;
  direction: "raises" | "lowers";
}

interface AdmissionPrediction {
  risk_percent: number;
  risk_band: Band;
  operating_threshold: number;
  threshold_crossed: boolean;
  top_factors: AdmissionFactor[];
  input_warnings: string[];
  validation: {
    test_period: string;
    auroc: number | null;
    auroc_95ci: [number, number] | null;
    sensitivity: number | null;
    specificity: number | null;
  };
  disclaimer: string;
}

type FieldKey =
  | "m_age"
  | "m_obstetric"
  | "m_preeclampsia"
  | "m_chorioamnionitis"
  | "m_intrauterine"
  | "m_birth"
  | "b_gender"
  | "b_weight"
  | "b_apgar"
  | "b_gestational"
  | "b_respiratory_failure"
  | "b_heart_rate"
  | "b_saturation"
  | "b_blood"
  | "b_rhesus";

type Field =
  | {
      key: FieldKey;
      label: string;
      kind: "number";
      unit: string;
      min: number;
      max: number;
      step?: number;
    }
  | {
      key: FieldKey;
      label: string;
      kind: "select";
      options: { value: string; label: string }[];
    };

const YES_NO = [
  { value: "0", label: "Нет" },
  { value: "1", label: "Да" },
];

// Codes whose meaning is not confirmed by the data owner are shown as codes.
const NEWBORN_FIELDS: Field[] = [
  {
    key: "b_gestational",
    label: "Срок гестации",
    kind: "number",
    unit: "нед",
    min: 22,
    max: 42,
  },
  {
    key: "b_weight",
    label: "Масса при рождении",
    kind: "number",
    unit: "г",
    min: 300,
    max: 6000,
    step: 10,
  },
  {
    key: "b_apgar",
    label: "Апгар",
    kind: "number",
    unit: "балл",
    min: 0,
    max: 10,
  },
  {
    key: "b_respiratory_failure",
    label: "Дыхательная недостаточность",
    kind: "select",
    options: ["0", "1", "2", "3"].map((v) => ({
      value: v,
      label: `${v} степень`,
    })),
  },
  {
    key: "b_heart_rate",
    label: "ЧСС",
    kind: "number",
    unit: "уд/мин",
    min: 40,
    max: 250,
  },
  {
    key: "b_saturation",
    label: "SpO₂",
    kind: "number",
    unit: "%",
    min: 20,
    max: 100,
  },
  {
    key: "b_gender",
    label: "Пол (код)",
    kind: "select",
    options: [
      { value: "1", label: "Код 1" },
      { value: "2", label: "Код 2" },
    ],
  },
  {
    key: "b_blood",
    label: "Группа крови",
    kind: "select",
    options: ["1", "2", "3", "4"].map((v) => ({ value: v, label: `Код ${v}` })),
  },
  {
    key: "b_rhesus",
    label: "Резус (код)",
    kind: "select",
    options: [
      { value: "0", label: "Код 0" },
      { value: "1", label: "Код 1" },
    ],
  },
];

const MATERNAL_FIELDS: Field[] = [
  {
    key: "m_age",
    label: "Возраст матери",
    kind: "number",
    unit: "лет",
    min: 14,
    max: 55,
  },
  {
    key: "m_birth",
    label: "Родоразрешение (код)",
    kind: "select",
    options: [
      { value: "1", label: "Код 1" },
      { value: "2", label: "Код 2" },
    ],
  },
  {
    key: "m_obstetric",
    label: "Отягощённый акуш. анамнез",
    kind: "select",
    options: YES_NO,
  },
  {
    key: "m_preeclampsia",
    label: "Преэклампсия",
    kind: "select",
    options: YES_NO,
  },
  {
    key: "m_chorioamnionitis",
    label: "Хориоамнионит",
    kind: "select",
    options: YES_NO,
  },
  {
    key: "m_intrauterine",
    label: "Внутриутробная инфекция",
    kind: "select",
    options: YES_NO,
  },
];

const EXAMPLE: Record<FieldKey, string> = {
  b_gestational: "27",
  b_weight: "940",
  b_apgar: "5",
  b_respiratory_failure: "2",
  b_heart_rate: "144",
  b_saturation: "87",
  b_gender: "1",
  b_blood: "1",
  b_rhesus: "1",
  m_age: "31",
  m_birth: "2",
  m_obstetric: "1",
  m_preeclampsia: "0",
  m_chorioamnionitis: "0",
  m_intrauterine: "0",
};

const ALL_FIELDS = [...NEWBORN_FIELDS, ...MATERNAL_FIELDS];

function displayValue(feature: string, value: number, unit: string) {
  const field = ALL_FIELDS.find((f) => f.key === feature);
  if (field?.kind === "select") {
    return (
      field.options.find((o) => Number(o.value) === value)?.label ??
      String(value)
    );
  }
  return unit ? `${value} ${unit}` : String(value);
}

const EMPTY = Object.fromEntries(
  Object.keys(EXAMPLE).map((k) => [k, ""]),
) as Record<FieldKey, string>;

const BAND: Record<Band, { label: string; className: string }> = {
  low: {
    label: "Низкий",
    className: "border-risk-low/35 bg-risk-low/10 text-risk-low",
  },
  moderate: {
    label: "Умеренный",
    className: "border-risk-moderate/35 bg-risk-moderate/10 text-risk-moderate",
  },
  elevated: {
    label: "Повышенный",
    className: "border-risk-elevated/35 bg-risk-elevated/10 text-risk-elevated",
  },
  high: {
    label: "Высокий",
    className: "border-risk-high/35 bg-risk-high/10 text-risk-high",
  },
};

const inputClass =
  "h-9 w-full rounded-md border bg-background px-2.5 text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-ring";

function FieldInput({
  field,
  value,
  onChange,
}: {
  field: Field;
  value: string;
  onChange: (key: FieldKey, value: string) => void;
}) {
  return (
    <label className="flex min-w-0 flex-col gap-1 text-xs">
      <span className="flex items-baseline justify-between gap-2 font-medium">
        <span className="truncate" title={field.label}>{field.label}</span>
        {field.kind === "number" && (
          <span className="shrink-0 text-muted-foreground">{field.unit}</span>
        )}
      </span>
      {field.kind === "number" ? (
        <input
          type="number"
          inputMode="decimal"
          min={field.min}
          max={field.max}
          step={field.step ?? 1}
          value={value}
          onChange={(e) => onChange(field.key, e.target.value)}
          className={inputClass}
        />
      ) : (
        <select
          value={value}
          onChange={(e) => onChange(field.key, e.target.value)}
          className={inputClass}
        >
          <option value="">—</option>
          {field.options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      )}
    </label>
  );
}

/**
 * Admission-time mortality risk from maternal and birth data.
 * Model trained on de-identified Asfendiyarov data, served at POST /predict/admission.
 */
export function AdmissionRiskCard() {
  const [values, setValues] = React.useState<Record<FieldKey, string>>(EXAMPLE);
  const [result, setResult] = React.useState<AdmissionPrediction | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  const update = (key: FieldKey, value: string) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  };

  const predict = async () => {
    setLoading(true);
    setError(null);
    try {
      const features = Object.fromEntries(
        Object.entries(values).map(([k, v]) => [
          k,
          v === "" ? null : Number(v),
        ]),
      );
      const response = await fetch(`${ML_API_URL}/predict/admission`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ features }),
      });
      const payload = (await response.json()) as AdmissionPrediction & {
        error?: string;
      };
      if (!response.ok)
        throw new Error(payload.error ?? `Ошибка API ${response.status}`);
      setResult(payload);
    } catch (e) {
      setResult(null);
      setError(
        e instanceof Error
          ? `${e.message}. Локальный ML-сервис должен быть запущен на ${ML_API_URL}.`
          : "Не удалось получить оценку",
      );
    } finally {
      setLoading(false);
    }
  };

  const maxContribution = Math.max(
    0.001,
    ...(result?.top_factors.map((f) => Math.abs(f.contribution)) ?? []),
  );
  const v = result?.validation;

  return (
    <section className="overflow-hidden rounded-md border bg-card">
      <div className="flex flex-col gap-3 border-b p-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Baby className="h-4 w-4 text-primary" />
            <h3 className="font-semibold">Оценка при поступлении</h3>
            <Badge variant="outline">Данные Асфендиярова</Badge>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Риск внутрибольничной летальности по перинатальным данным, доступным
            в момент поступления
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setValues(EXAMPLE)}
          >
            Пример
          </Button>
          <Button variant="outline" size="sm" onClick={() => setValues(EMPTY)}>
            Очистить
          </Button>
          <Button size="sm" onClick={predict} disabled={loading}>
            {loading ? <Loader2 className="animate-spin" /> : <RefreshCw />}
            Рассчитать
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <div className="space-y-5 border-b p-4 lg:border-b-0 lg:border-r">
          <div>
            <p className="mb-2.5 text-xs font-semibold uppercase text-muted-foreground">
              Новорождённый
            </p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {NEWBORN_FIELDS.map((f) => (
                <FieldInput
                  key={f.key}
                  field={f}
                  value={values[f.key]}
                  onChange={update}
                />
              ))}
            </div>
          </div>
          <div>
            <p className="mb-2.5 text-xs font-semibold uppercase text-muted-foreground">
              Мать
            </p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {MATERNAL_FIELDS.map((f) => (
                <FieldInput
                  key={f.key}
                  field={f}
                  value={values[f.key]}
                  onChange={update}
                />
              ))}
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Пустые поля заменяются медианой обучающей выборки.
          </p>
        </div>

        <div className="p-4">
          {error && (
            <div className="flex gap-2 rounded-md border border-risk-high/30 bg-risk-high/5 p-3 text-xs text-risk-high">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {result ? (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div
                  className={cn(
                    "flex h-28 w-28 shrink-0 flex-col items-center justify-center rounded-full border-[10px]",
                    BAND[result.risk_band].className,
                  )}
                >
                  <span className="text-2xl font-bold leading-none tabular-nums">
                    {result.risk_percent.toFixed(1)}%
                  </span>
                  <span className="mt-1.5 text-[10px] font-semibold uppercase leading-none">
                    {BAND[result.risk_band].label}
                  </span>
                </div>
                <div className="space-y-1 text-xs text-muted-foreground">
                  <p>
                    Порог тревоги:{" "}
                    <span className="font-medium tabular-nums text-foreground">
                      {(result.operating_threshold * 100).toFixed(1)}%
                    </span>
                  </p>
                  {v?.auroc != null && (
                    <p className="tabular-nums">
                      Проверка {v.test_period}: AUROC {v.auroc.toFixed(2)}
                      {v.auroc_95ci &&
                        ` (${v.auroc_95ci[0].toFixed(2)}–${v.auroc_95ci[1].toFixed(2)})`}
                    </p>
                  )}
                  {v?.sensitivity != null && v.specificity != null && (
                    <p className="tabular-nums">
                      Чувств. {Math.round(v.sensitivity * 100)}% · специф.{" "}
                      {Math.round(v.specificity * 100)}%
                    </p>
                  )}
                </div>
              </div>

              <div>
                <h4 className="text-xs font-semibold">
                  Ключевые факторы (SHAP)
                </h4>
                <div className="mt-2.5 space-y-2.5">
                  {result.top_factors.map((f) => (
                    <div key={f.feature}>
                      <div className="flex items-center justify-between gap-3 text-xs">
                        <span className="truncate font-medium">
                          {f.label}
                          {f.value != null && (
                            <span className="ml-1 font-normal tabular-nums text-muted-foreground">
                              {displayValue(f.feature, f.value, f.unit)}
                            </span>
                          )}
                        </span>
                        <span
                          className={cn(
                            "shrink-0 tabular-nums",
                            f.direction === "raises"
                              ? "text-risk-high"
                              : "text-primary",
                          )}
                        >
                          {f.contribution >= 0 ? "+" : ""}
                          {f.contribution.toFixed(2)}
                        </span>
                      </div>
                      <div className="mt-1 h-1.5 overflow-hidden rounded-sm bg-muted">
                        <div
                          className={cn(
                            "h-full rounded-sm",
                            f.direction === "raises"
                              ? "bg-risk-high"
                              : "bg-primary",
                          )}
                          style={{
                            width: `${Math.max(6, (Math.abs(f.contribution) / maxContribution) * 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {result.input_warnings.length > 0 && (
                <ul className="space-y-1 rounded-md bg-muted/50 p-2.5 text-[11px] text-muted-foreground">
                  {result.input_warnings.map((w) => (
                    <li key={w}>• {w}</li>
                  ))}
                </ul>
              )}
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                {result.disclaimer}
              </p>
            </div>
          ) : (
            !error && (
              <div className="flex min-h-52 flex-col items-center justify-center text-center">
                <Activity className="h-7 w-7 text-muted-foreground" />
                <p className="mt-3 text-sm font-medium">
                  Оценка ещё не рассчитана
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Заполните данные и нажмите «Рассчитать»
                </p>
              </div>
            )
          )}
        </div>
      </div>
    </section>
  );
}
