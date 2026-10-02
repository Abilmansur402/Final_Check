import { useParams, useNavigate, Navigate } from 'react-router-dom'
import { useLivePatients } from '@/hooks/useLivePatients'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { RiskGauge } from '@/components/patient/RiskGauge'
import { RiskIndicator } from '@/components/patient/RiskIndicator'
import { SHAPWaterfall } from '@/components/patient/SHAPWaterfall'
import { VitalsPanel } from '@/components/patient/VitalsPanel'
import { FlagForReview } from '@/components/patient/FlagForReview'
import { PatientCard } from '@/components/patient/PatientCard'

export function PatientCommandCenter() {
  const { patientId } = useParams()
  const navigate = useNavigate()
  const { patients, getPatient } = useLivePatients()

  if (!patientId) {
    return <Navigate to={`/patient/${patients[0].id}`} replace />
  }

  const patient = getPatient(patientId)
  if (!patient) {
    return <Navigate to={`/patient/${patients[0].id}`} replace />
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[264px_minmax(0,1fr)_300px]">
      {/* Patient roster */}
      <aside className="space-y-2">
        <p className="px-1 text-xs font-medium uppercase text-muted-foreground">
          Пациенты отделения
        </p>
        {patients.map((p) => (
          <PatientCard
            key={p.id}
            patient={p}
            selected={p.id === patient.id}
            onSelect={(id) => navigate(`/patient/${id}`)}
          />
        ))}
      </aside>

      {/* Main column: gauge + explainability */}
      <div className="space-y-6">
        <Card>
          <CardHeader className="flex-row items-start justify-between gap-4 space-y-0">
            <div>
              <CardTitle className="text-xl">{patient.name}</CardTitle>
              <CardDescription>
                {patient.id} · {patient.bed} · обновлено {patient.lastUpdated}
              </CardDescription>
            </div>
            <FlagForReview patient={patient} />
          </CardHeader>
          <CardContent className="grid gap-6 md:grid-cols-[240px_minmax(0,1fr)] md:items-center xl:grid-cols-1 2xl:grid-cols-[240px_minmax(0,1fr)]">
            <RiskGauge
              score={patient.riskScore}
              baseline={patient.baselineRisk}
            />
            <div className="space-y-3">
              <RiskIndicator
                score={patient.riskScore}
                delta={patient.riskDelta}
              />
              <p className="text-sm text-muted-foreground">
                Шкала показывает вероятность неблагоприятного исхода в ближайшие
                24 часа по оценке модели. Оценивайте её вместе с влияющими
                факторами и осмотром пациента: модель подсказывает, но решение
                принимает врач.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Вклад признаков (SHAP)</CardTitle>
            <CardDescription>
              Как каждый фактор сдвигает прогноз относительно базового риска.
              Выберите фактор, чтобы увидеть клиническую интерпретацию.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SHAPWaterfall
              baseline={patient.baselineRisk}
              features={patient.shap}
              finalScore={patient.riskScore}
            />
          </CardContent>
        </Card>
      </div>

      {/* Context panel: vitals + patient ID */}
      <aside>
        <Card className="xl:sticky xl:top-4">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle>Данные пациента</CardTitle>
              <Badge variant="muted">{patient.id}</Badge>
            </div>
            <CardDescription>
              Показатели с монитора в реальном времени
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="rounded-md bg-muted/60 p-2">
                <p className="text-muted-foreground">Срок</p>
                <p className="font-semibold">
                  {patient.gestationalAgeWeeks} нед
                </p>
              </div>
              <div className="rounded-md bg-muted/60 p-2">
                <p className="text-muted-foreground">Масса</p>
                <p className="font-semibold">{patient.birthWeightGrams} г</p>
              </div>
              <div className="rounded-md bg-muted/60 p-2">
                <p className="text-muted-foreground">Возраст</p>
                <p className="font-semibold">{patient.dayOfLife} сут</p>
              </div>
            </div>
            <Separator />
            <VitalsPanel patient={patient} />
          </CardContent>
        </Card>
      </aside>
    </div>
  )
}
