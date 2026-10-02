import * as React from 'react'
import {
  Activity,
  AlertTriangle,
  CalendarPlus,
  CheckCircle2,
  Database,
  Download,
  FileJson,
  FileSpreadsheet,
  FileText,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Upload,
} from 'lucide-react'
import { useAuth } from '@/auth/AuthProvider'
import { Badge } from '@/components/ui/badge'
import { SHAPDecisionPanel } from '@/components/patient/SHAPDecisionPanel'
import { AdmissionRiskCard } from '@/components/patient/AdmissionRiskCard'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  MODEL_FEATURES,
  parsePatientCsv,
  parsePatientJson,
  type PatientBundle,
  type PatientPrediction,
} from '@/lib/patientImport'
import { cn } from '@/lib/utils'
import { isSupabaseConfigured, supabase } from '@/lib/supabase'

const DEMO_BASE = '/demo/SYN-NICU-0001'
const ML_API_URL = import.meta.env.VITE_ML_API_URL ?? 'http://127.0.0.1:8000'
const APPOINTMENTS_KEY = 'neooutcome.demo.appointments'

const RISK_LABELS: Record<PatientPrediction['risk_band'], string> = {
  low: 'Низкий',
  moderate: 'Умеренный',
  elevated: 'Повышенный',
  high: 'Высокий',
}

const FEATURE_LABELS: Partial<Record<(typeof MODEL_FEATURES)[number], string>> = {
  gender: 'Пол (M=1, F=0)',
  age_days_at_admission: 'Возраст, дней',
  hr_mean: 'ЧСС, среднее',
  hr_min: 'ЧСС, минимум',
  hr_max: 'ЧСС, максимум',
  rr_mean: 'ЧДД, среднее',
  rr_min: 'ЧДД, минимум',
  rr_max: 'ЧДД, максимум',
  temp_mean: 'Температура, средняя',
  temp_max: 'Температура, максимум',
  sbp_mean: 'Систолическое АД',
  vitals_count_12h: 'Измерений витальных',
  ph_mean: 'pH, среднее',
  ph_min: 'pH, минимум',
  lactate_mean: 'Лактат, среднее',
  lactate_max: 'Лактат, максимум',
  po2_mean: 'pO2, среднее',
  po2_min: 'pO2, минимум',
  pco2_mean: 'pCO2, среднее',
  base_excess_mean: 'Base excess, среднее',
  base_excess_min: 'Base excess, минимум',
  glucose_mean: 'Глюкоза, средняя',
  glucose_min: 'Глюкоза, минимум',
  glucose_max: 'Глюкоза, максимум',
  hemoglobin_mean: 'Гемоглобин',
  platelets_min: 'Тромбоциты, минимум',
  wbc_mean: 'Лейкоциты, среднее',
  wbc_max: 'Лейкоциты, максимум',
  sodium_mean: 'Натрий',
  potassium_mean: 'Калий',
  labs_count_12h: 'Лабораторных измерений',
}

interface Appointment {
  id: string
  patientId: string
  patientName: string
  scheduledAt: string
  type: string
  reason: string
  clinician: string
  status: 'scheduled'
  createdAt: string
  source: 'supabase' | 'local'
}

function defaultAppointmentTime() {
  const date = new Date(Date.now() + 60 * 60 * 1000)
  date.setMinutes(0, 0, 0)
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
  return local.toISOString().slice(0, 16)
}

function valueText(value: number | null) {
  if (value === null) return 'нет данных'
  return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/0+$/, '').replace(/\.$/, '')
}

export function PatientIntakePage() {
  const { doctor } = useAuth()
  const inputRef = React.useRef<HTMLInputElement>(null)
  const ownedPdfUrl = React.useRef<string | null>(null)
  const [bundle, setBundle] = React.useState<PatientBundle | null>(null)
  const [prediction, setPrediction] = React.useState<PatientPrediction | null>(null)
  const [pdfUrl, setPdfUrl] = React.useState<string | null>(null)
  const [loadedFile, setLoadedFile] = React.useState<string | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const [isLoadingDemo, setIsLoadingDemo] = React.useState(false)
  const [isPredicting, setIsPredicting] = React.useState(false)
  const [resultSource, setResultSource] = React.useState<'saved' | 'live' | null>(null)
  const [apiStatus, setApiStatus] = React.useState<'checking' | 'online' | 'offline'>('checking')
  const [appointmentOpen, setAppointmentOpen] = React.useState(false)
  const [appointmentTime, setAppointmentTime] = React.useState(defaultAppointmentTime)
  const [appointmentType, setAppointmentType] = React.useState('Повторный осмотр NICU')
  const [appointmentReason, setAppointmentReason] = React.useState('Проверка состояния после ML-оценки риска')
  const [appointment, setAppointment] = React.useState<Appointment | null>(null)
  const [isSavingAppointment, setIsSavingAppointment] = React.useState(false)

  React.useEffect(() => {
    const controller = new AbortController()
    fetch(`${ML_API_URL}/health`, { signal: controller.signal })
      .then((response) => {
        setApiStatus(response.ok ? 'online' : 'offline')
      })
      .catch(() => setApiStatus('offline'))
    return () => controller.abort()
  }, [])

  React.useEffect(
    () => () => {
      if (ownedPdfUrl.current) URL.revokeObjectURL(ownedPdfUrl.current)
    },
    [],
  )

  const setOwnedPdf = (file: File) => {
    if (ownedPdfUrl.current) URL.revokeObjectURL(ownedPdfUrl.current)
    const nextUrl = URL.createObjectURL(file)
    ownedPdfUrl.current = nextUrl
    setPdfUrl(nextUrl)
  }

  const loadDemo = async () => {
    setIsLoadingDemo(true)
    setError(null)
    try {
      const response = await fetch(`${DEMO_BASE}_bundle.json`)
      if (!response.ok) throw new Error('Демо-пациент не найден')
      const nextBundle = parsePatientJson(await response.json())
      setBundle(nextBundle)
      setPrediction(nextBundle.prediction ?? null)
      setResultSource(nextBundle.prediction ? 'saved' : null)
      setPdfUrl(`${DEMO_BASE}_patient_card.pdf`)
      setLoadedFile('Синтетический комплект SYN-NICU-0001')
      setAppointment(null)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Не удалось загрузить демо')
    } finally {
      setIsLoadingDemo(false)
    }
  }

  const handleFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    setError(null)
    setAppointment(null)
    setLoadedFile(file.name)

    try {
      const extension = file.name.split('.').pop()?.toLowerCase()
      if (extension === 'pdf' || file.type === 'application/pdf') {
        setOwnedPdf(file)
        return
      }

      const text = await file.text()
      const nextBundle =
        extension === 'csv'
          ? parsePatientCsv(text)
          : parsePatientJson(JSON.parse(text) as unknown)
      setBundle(nextBundle)
      setPrediction(nextBundle.prediction ?? null)
      setResultSource(nextBundle.prediction ? 'saved' : null)
      setPdfUrl(null)
    } catch (fileError) {
      setError(fileError instanceof Error ? fileError.message : 'Файл не удалось прочитать')
    } finally {
      event.target.value = ''
    }
  }

  const runPrediction = async () => {
    if (!bundle) return
    setIsPredicting(true)
    setError(null)
    try {
      const response = await fetch(`${ML_API_URL}/predict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ features: bundle.features }),
      })
      const payload = (await response.json()) as PatientPrediction & { error?: string }
      if (!response.ok) throw new Error(payload.error ?? 'Модель не приняла данные')
      setPrediction(payload)
      setResultSource('live')
      setApiStatus('online')
    } catch (predictionError) {
      setApiStatus('offline')
      setError(
        predictionError instanceof Error
          ? `${predictionError.message}. Локальный ML-сервис должен быть запущен на ${ML_API_URL}.`
          : 'Не удалось получить оценку модели',
      )
    } finally {
      setIsPredicting(false)
    }
  }

  const saveAppointment = async () => {
    if (!bundle || !doctor) return
    setIsSavingAppointment(true)
    setError(null)
    try {
      if (isSupabaseConfigured) {
        if (!supabase || !doctor.authUserId) {
          throw new Error('Войдите через Supabase Auth перед сохранением записи.')
        }
        const { data, error: insertError } = await supabase
          .from('appointments')
          .insert({
            patient_ref: bundle.patient.patient_id,
            patient_label: bundle.patient.full_name,
            scheduled_at: new Date(appointmentTime).toISOString(),
            appointment_type: appointmentType,
            reason: appointmentReason,
            clinician_name: doctor.name,
            created_by: doctor.authUserId,
          })
          .select('id, patient_ref, patient_label, scheduled_at, appointment_type, reason, clinician_name, status, created_at')
          .single()

        if (insertError || !data) throw new Error(insertError?.message ?? 'Не удалось сохранить запись в Supabase')
        setAppointment({
          id: data.id,
          patientId: data.patient_ref,
          patientName: data.patient_label,
          scheduledAt: data.scheduled_at,
          type: data.appointment_type,
          reason: data.reason,
          clinician: data.clinician_name,
          status: data.status,
          createdAt: data.created_at,
          source: 'supabase',
        })
      } else {
        const nextAppointment: Appointment = {
          id: `APT-${Date.now()}`,
          patientId: bundle.patient.patient_id,
          patientName: bundle.patient.full_name,
          scheduledAt: appointmentTime,
          type: appointmentType,
          reason: appointmentReason,
          clinician: doctor.name,
          status: 'scheduled',
          createdAt: new Date().toISOString(),
          source: 'local',
        }
        const stored = window.localStorage.getItem(APPOINTMENTS_KEY)
        const appointments = stored ? (JSON.parse(stored) as Appointment[]) : []
        window.localStorage.setItem(APPOINTMENTS_KEY, JSON.stringify([...appointments, nextAppointment]))
        setAppointment(nextAppointment)
      }
      setAppointmentOpen(false)
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Не удалось сохранить запись')
    } finally {
      setIsSavingAppointment(false)
    }
  }

  const maxContribution = Math.max(
    0.001,
    ...(prediction?.top_factors.map((factor) => Math.abs(factor.contribution)) ?? []),
  )

  return (
    <div className="space-y-5">
      <section className="flex flex-col gap-4 border-b pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm font-medium text-primary">
            <ShieldCheck className="h-4 w-4" />
            Синтетический клинический поток
          </div>
          <h2 className="text-2xl font-semibold">Приём пациента и ML-оценка</h2>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            Машинные признаки первых 12 часов, карта пациента и внутренний повторный осмотр
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={apiStatus === 'online' ? 'default' : 'muted'}>
            <span
              className={cn(
                'mr-1.5 h-1.5 w-1.5 rounded-full',
                apiStatus === 'online' ? 'bg-white' : 'bg-muted-foreground',
              )}
            />
            {apiStatus === 'checking'
              ? 'Проверка ML-сервиса'
              : apiStatus === 'online'
                ? 'Модель доступна'
                : 'Модель офлайн'}
          </Badge>
          <Badge variant="outline">Только демо</Badge>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[360px_minmax(0,1fr)]">
        <div className="space-y-4">
          <div className="rounded-md border bg-card p-4">
            <h3 className="text-sm font-semibold">Источник данных</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              CSV/JSON передают признаки модели. PDF используется как врачебное представление.
            </p>

            <input
              ref={inputRef}
              type="file"
              accept=".csv,.json,.pdf,text/csv,application/json,application/pdf"
              className="hidden"
              onChange={handleFile}
            />
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="mt-4 flex min-h-36 w-full flex-col items-center justify-center rounded-md border border-dashed bg-background px-4 text-center transition-colors hover:border-primary hover:bg-primary/5"
            >
              <Upload className="h-6 w-6 text-primary" />
              <span className="mt-2 text-sm font-medium">Загрузить файл пациента</span>
              <span className="mt-1 text-xs text-muted-foreground">CSV, JSON или PDF</span>
            </button>

            <Button
              type="button"
              variant="outline"
              className="mt-3 w-full"
              onClick={loadDemo}
              disabled={isLoadingDemo}
            >
              {isLoadingDemo ? <Loader2 className="animate-spin" /> : <Activity />}
              Загрузить демо-пациента
            </Button>

            {loadedFile && (
              <div className="mt-4 rounded-md border bg-muted/40 p-3 text-xs">
                <p className="font-medium text-foreground">Загружено</p>
                <p className="mt-1 break-words text-muted-foreground">{loadedFile}</p>
              </div>
            )}

            <div className="mt-4 grid grid-cols-3 gap-2">
              <a
                href={`${DEMO_BASE}_features.csv`}
                className="flex flex-col items-center gap-1 rounded-md border px-2 py-2 text-center text-[11px] hover:bg-muted"
              >
                <FileSpreadsheet className="h-4 w-4 text-primary" /> CSV
              </a>
              <a
                href={`${DEMO_BASE}_bundle.json`}
                className="flex flex-col items-center gap-1 rounded-md border px-2 py-2 text-center text-[11px] hover:bg-muted"
              >
                <FileJson className="h-4 w-4 text-primary" /> JSON
              </a>
              <a
                href={`${DEMO_BASE}_patient_card.pdf`}
                target="_blank"
                rel="noreferrer"
                className="flex flex-col items-center gap-1 rounded-md border px-2 py-2 text-center text-[11px] hover:bg-muted"
              >
                <FileText className="h-4 w-4 text-primary" /> PDF
              </a>
            </div>
          </div>

          <div className="rounded-md border bg-card p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                <Database className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-semibold">Asfendiyarov University dataset</h3>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  Обезличенный исследовательский набор клинических числовых признаков,
                  предоставленный для хакатона. Используется для демонстрации агрегированного
                  анализа и ML-пайплайна.
                </p>
              </div>
            </div>
            <dl className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
              <div className="rounded-md bg-muted/50 px-2 py-2">
                <dt className="text-muted-foreground">Rows</dt>
                <dd className="mt-1 font-semibold tabular-nums">1,105</dd>
              </div>
              <div className="rounded-md bg-muted/50 px-2 py-2">
                <dt className="text-muted-foreground">Features</dt>
                <dd className="mt-1 font-semibold tabular-nums">26</dd>
              </div>
              <div className="rounded-md bg-muted/50 px-2 py-2">
                <dt className="text-muted-foreground">IDs</dt>
                <dd className="mt-1 font-semibold">Removed</dd>
              </div>
            </dl>
          </div>
        </div>

        <div className="min-w-0 rounded-md border bg-card p-4">
          {bundle ? (
            <Tabs defaultValue="summary">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="summary">Пациент</TabsTrigger>
                <TabsTrigger value="features">31 признак</TabsTrigger>
                <TabsTrigger value="document">PDF</TabsTrigger>
              </TabsList>

              <TabsContent value="summary" className="mt-4">
                <div className="flex flex-col gap-4 border-b pb-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-semibold">{bundle.patient.full_name}</h3>
                      {bundle.synthetic && <Badge variant="outline">Синтетический</Badge>}
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {bundle.patient.patient_id} • {bundle.patient.sex} • {bundle.patient.date_of_birth}
                    </p>
                  </div>
                  <div className="text-left text-xs text-muted-foreground sm:text-right">
                    <p className="font-medium text-foreground">{bundle.encounter.department}</p>
                    <p>{bundle.encounter.encounter_id}</p>
                  </div>
                </div>

                <dl className="grid gap-4 py-4 text-sm sm:grid-cols-2 xl:grid-cols-4">
                  <div>
                    <dt className="text-xs text-muted-foreground">Гестационный возраст</dt>
                    <dd className="mt-1 font-medium">{bundle.patient.gestational_age ?? 'не указан'}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Текущий вес</dt>
                    <dd className="mt-1 font-medium">
                      {bundle.patient.current_weight_g ? `${bundle.patient.current_weight_g} г` : 'не указан'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Поступление</dt>
                    <dd className="mt-1 font-medium">
                      {new Date(bundle.encounter.admitted_at).toLocaleString('ru-KZ')}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Окно прогноза</dt>
                    <dd className="mt-1 font-medium">Первые 12 часов</dd>
                  </div>
                </dl>

                <div className="border-t pt-4">
                  <p className="text-xs text-muted-foreground">Причина поступления</p>
                  <p className="mt-1 text-sm font-medium">{bundle.encounter.admission_diagnosis}</p>
                </div>
              </TabsContent>

              <TabsContent value="features" className="mt-4">
                <div className="max-h-[520px] overflow-auto rounded-md border">
                  <table className="w-full text-left text-sm">
                    <thead className="sticky top-0 bg-muted">
                      <tr>
                        <th className="px-3 py-2 font-medium">Признак</th>
                        <th className="px-3 py-2 font-medium">Поле модели</th>
                        <th className="px-3 py-2 text-right font-medium">Значение</th>
                      </tr>
                    </thead>
                    <tbody>
                      {MODEL_FEATURES.map((feature) => (
                        <tr key={feature} className="border-t">
                          <td className="px-3 py-2">{FEATURE_LABELS[feature] ?? feature}</td>
                          <td className="px-3 py-2 font-mono text-xs text-muted-foreground">{feature}</td>
                          <td className="px-3 py-2 text-right font-medium tabular-nums">
                            {valueText(bundle.features[feature])}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </TabsContent>

              <TabsContent value="document" className="mt-4">
                {pdfUrl ? (
                  <div className="overflow-hidden rounded-md border bg-muted/30">
                    <div className="flex items-center justify-between border-b px-3 py-2">
                      <span className="text-xs font-medium">Карта пациента PDF</span>
                      <a
                        href={pdfUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                      >
                        <Download className="h-3.5 w-3.5" /> Открыть
                      </a>
                    </div>
                    <iframe title="Синтетическая карта пациента" src={pdfUrl} className="h-[620px] w-full" />
                  </div>
                ) : (
                  <div className="flex min-h-48 flex-col items-center justify-center rounded-md border border-dashed text-center">
                    <FileText className="h-6 w-6 text-muted-foreground" />
                    <p className="mt-2 text-sm font-medium">PDF не приложен</p>
                    <p className="mt-1 text-xs text-muted-foreground">Загрузите PDF отдельно или откройте демо-комплект</p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          ) : pdfUrl ? (
            <div className="overflow-hidden rounded-md border bg-muted/30">
              <iframe title="Загруженная карта пациента" src={pdfUrl} className="h-[680px] w-full" />
            </div>
          ) : (
            <div className="flex min-h-[360px] flex-col items-center justify-center text-center">
              <FileJson className="h-8 w-8 text-muted-foreground" />
              <p className="mt-3 text-sm font-medium">Данные пациента не загружены</p>
              <p className="mt-1 max-w-sm text-xs text-muted-foreground">
                Для быстрого просмотра используйте синтетический демо-комплект
              </p>
            </div>
          )}
        </div>
      </section>

      {error && (
        <div className="flex items-start gap-3 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      <section className="rounded-md border bg-card">
        <div className="flex flex-col gap-3 border-b px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-sm font-semibold">Оценка модели</h3>
            <p className="mt-1 text-xs text-muted-foreground">XGBoost • внутрибольничная смертность • признаки первых 12 часов</p>
          </div>
          <Button onClick={runPrediction} disabled={!bundle || isPredicting}>
            {isPredicting ? <Loader2 className="animate-spin" /> : <RefreshCw />}
            Рассчитать риск
          </Button>
        </div>

        {prediction ? (
          <>
            <div className="grid gap-0 xl:grid-cols-[260px_minmax(0,1fr)_minmax(280px,0.8fr)]">
            <div className="flex flex-col justify-center border-b p-5 xl:border-b-0 xl:border-r">
              <div
                className={cn(
                  'flex aspect-square w-full max-w-48 flex-col items-center justify-center self-center rounded-full border-[14px]',
                  prediction.risk_band === 'high'
                    ? 'border-risk-high/35 bg-risk-high/10 text-risk-high'
                    : prediction.risk_band === 'elevated'
                      ? 'border-risk-elevated/35 bg-risk-elevated/10 text-risk-elevated'
                      : prediction.risk_band === 'moderate'
                        ? 'border-risk-moderate/35 bg-risk-moderate/10 text-risk-moderate'
                        : 'border-risk-low/35 bg-risk-low/10 text-risk-low',
                )}
              >
                <span className="text-4xl font-bold tabular-nums">{prediction.risk_percent.toFixed(1)}%</span>
                <span className="mt-1 text-xs font-semibold uppercase">{RISK_LABELS[prediction.risk_band]}</span>
              </div>
              <div className="mt-4 text-center text-xs text-muted-foreground">
                <p>Рабочий порог: {(prediction.operating_threshold * 100).toFixed(1)}%</p>
                <p className="mt-1">{resultSource === 'live' ? 'Результат локальной модели' : 'Сохранённый демо-результат'}</p>
              </div>
            </div>

            <div className="border-b p-5 xl:border-b-0 xl:border-r">
              <h4 className="text-sm font-semibold">Ключевые факторы</h4>
              <div className="mt-4 space-y-3">
                {prediction.top_factors.map((factor) => (
                  <div key={factor.feature}>
                    <div className="flex items-center justify-between gap-3 text-xs">
                      <span className="truncate font-medium">{factor.label}</span>
                      <span className="shrink-0 tabular-nums text-muted-foreground">
                        {factor.contribution >= 0 ? '+' : ''}{factor.contribution.toFixed(3)}
                      </span>
                    </div>
                    <div className="mt-1.5 h-2 overflow-hidden rounded-sm bg-muted">
                      <div
                        className={cn('h-full rounded-sm', factor.direction === 'raises' ? 'bg-risk-high' : 'bg-primary')}
                        style={{ width: `${Math.max(6, (Math.abs(factor.contribution) / maxContribution) * 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-5">
              <h4 className="text-sm font-semibold">Действия для врачебной проверки</h4>
              <div className="mt-3 space-y-3">
                {prediction.review_actions.map((action) => (
                  <div key={action} className="flex gap-2 text-xs leading-relaxed">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span>{action}</span>
                  </div>
                ))}
              </div>
            </div>
            </div>
            <div className="border-t bg-muted/20 p-5">
              <SHAPDecisionPanel prediction={prediction} />
            </div>
          </>
        ) : (
          <div className="flex min-h-52 flex-col items-center justify-center p-6 text-center">
            <Activity className="h-7 w-7 text-muted-foreground" />
            <p className="mt-3 text-sm font-medium">Оценка ещё не рассчитана</p>
            <p className="mt-1 text-xs text-muted-foreground">Требуется валидный CSV или JSON из 31 признака</p>
          </div>
        )}
      </section>

      <AdmissionRiskCard />

      {bundle && prediction && (
        <section className="flex flex-col gap-4 rounded-md border bg-card p-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="text-sm font-semibold">Повторный клинический осмотр</h3>
            {appointment ? (
              <>
                <p className="mt-1 text-sm text-primary">
                  Запланирован на {new Date(appointment.scheduledAt).toLocaleString('ru-KZ')} • {appointment.clinician}
                </p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {appointment.source === 'supabase' ? 'Сохранено в Supabase' : 'Демо-запись в браузере'}
                </p>
              </>
            ) : (
              <p className="mt-1 text-xs text-muted-foreground">
                Внутренняя запись учреждения, без интеграции с eGov
              </p>
            )}
          </div>
          <Button variant={appointment ? 'outline' : 'default'} onClick={() => setAppointmentOpen(true)}>
            <CalendarPlus />
            {appointment ? 'Изменить запись' : 'Записать на осмотр'}
          </Button>
        </section>
      )}

      <div className="flex items-start gap-2 text-xs text-muted-foreground">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        <p>Прототип не предназначен для клинического применения. Решение принимает врач после проверки исходных данных.</p>
      </div>

      <Dialog open={appointmentOpen} onOpenChange={setAppointmentOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Запись на повторный осмотр</DialogTitle>
            <DialogDescription>
              {bundle?.patient.full_name} • {bundle?.patient.patient_id}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <label className="grid gap-1.5 text-sm">
              <span className="font-medium">Дата и время</span>
              <input
                type="datetime-local"
                value={appointmentTime}
                onChange={(event) => setAppointmentTime(event.target.value)}
                className="h-10 rounded-md border bg-background px-3"
              />
            </label>
            <label className="grid gap-1.5 text-sm">
              <span className="font-medium">Тип осмотра</span>
              <select
                value={appointmentType}
                onChange={(event) => setAppointmentType(event.target.value)}
                className="h-10 rounded-md border bg-background px-3"
              >
                <option>Повторный осмотр NICU</option>
                <option>Консилиум старшего врача</option>
                <option>Контроль после новых анализов</option>
              </select>
            </label>
            <label className="grid gap-1.5 text-sm">
              <span className="font-medium">Основание</span>
              <textarea
                value={appointmentReason}
                onChange={(event) => setAppointmentReason(event.target.value)}
                rows={3}
                className="rounded-md border bg-background px-3 py-2"
              />
            </label>
            <div className="rounded-md border bg-muted/40 p-3 text-xs text-muted-foreground">
              Ответственный: <span className="font-medium text-foreground">{doctor?.name}</span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAppointmentOpen(false)}>Отмена</Button>
            <Button onClick={saveAppointment} disabled={!appointmentTime || !appointmentReason.trim() || isSavingAppointment}>
              {isSavingAppointment ? <Loader2 className="animate-spin" /> : <CalendarPlus />}
              {isSavingAppointment ? 'Сохранение...' : 'Сохранить запись'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
