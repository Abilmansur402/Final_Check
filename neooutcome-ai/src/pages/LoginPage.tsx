import * as React from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { Activity, Building2, IdCard, Lock, ShieldCheck, User } from 'lucide-react'
import { useAuth } from '@/auth/AuthProvider'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Label } from '@/components/ui/label'

interface LocationState {
  from?: {
    pathname?: string
  }
}

const DEMO_LOGIN = 'doctor.karimova'
const DEMO_ID = 'KZ-NICU-001'
const DEMO_PASSWORD = 'NeoDemo2026!'

export function LoginPage() {
  const { isAuthenticated, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const state = location.state as LocationState | null
  const returnTo = state?.from?.pathname ?? '/'

  const [form, setForm] = React.useState({
    login: '',
    doctorId: '',
    password: '',
  })
  const [error, setError] = React.useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  if (isAuthenticated) {
    return <Navigate to={returnTo} replace />
  }

  const updateField =
    (field: keyof typeof form) =>
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setForm((current) => ({ ...current, [field]: event.target.value }))
      setError(null)
    }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsSubmitting(true)
    try {
      const result = await login(form)
      if (!result.ok) {
        setError(result.message ?? 'Не удалось войти.')
        return
      }
      navigate(returnTo, { replace: true })
    } finally {
      setIsSubmitting(false)
    }
  }

  const fillDemo = () => {
    setForm({
      login: DEMO_LOGIN,
      doctorId: DEMO_ID,
      password: DEMO_PASSWORD,
    })
    setError(null)
  }

  return (
    <main className="min-h-screen bg-background">
      <section className="grid min-h-screen lg:grid-cols-[0.95fr_1.05fr]">
        <div className="flex flex-col justify-between border-r bg-card px-6 py-7 md:px-10">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Activity className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-semibold">NeoOutcome AI</p>
              <p className="text-xs text-muted-foreground">
                Поддержка клинических решений
              </p>
            </div>
          </div>

          <div className="my-10 max-w-xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1 text-xs font-medium text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5 text-primary" />
              Доступ только для медицинского персонала
            </div>
            <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
              Вход в рабочее пространство врача
            </h1>
            <p className="mt-4 text-sm leading-6 text-muted-foreground md:text-base">
              После входа врач получает доступ к пациентскому дашборду,
              ML-оценке риска и региональной карте Казахстана по показателям
              детской и неонатальной смертности.
            </p>
          </div>

          <div className="grid gap-3 text-sm text-muted-foreground sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
            <div className="rounded-lg border bg-background p-3">
              <Building2 className="mb-2 h-4 w-4 text-primary" />
              Медучреждения
            </div>
            <div className="rounded-lg border bg-background p-3">
              <User className="mb-2 h-4 w-4 text-primary" />
              Врачи ОРИТН
            </div>
            <div className="rounded-lg border bg-background p-3">
              <ShieldCheck className="mb-2 h-4 w-4 text-primary" />
              Защищённый демо-доступ
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center px-4 py-10">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Авторизация врача</CardTitle>
              <CardDescription>
                Введите логин, ID врача и пароль учреждения.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form className="space-y-4" onSubmit={handleSubmit}>
                <div className="space-y-1.5">
                  <Label htmlFor="doctor-login">Логин</Label>
                  <div className="relative">
                    <User className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <input
                      id="doctor-login"
                      value={form.login}
                      onChange={updateField('login')}
                      autoComplete="username"
                      className="h-10 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      placeholder="doctor.karimova"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="doctor-id">ID врача</Label>
                  <div className="relative">
                    <IdCard className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <input
                      id="doctor-id"
                      value={form.doctorId}
                      onChange={updateField('doctorId')}
                      autoComplete="organization-title"
                      className="h-10 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      placeholder="KZ-NICU-001"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="doctor-password">Пароль</Label>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <input
                      id="doctor-password"
                      type="password"
                      value={form.password}
                      onChange={updateField('password')}
                      autoComplete="current-password"
                      className="h-10 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      placeholder="Введите пароль"
                    />
                  </div>
                </div>

                {error && (
                  <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                    {error}
                  </p>
                )}

                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? 'Проверка...' : 'Войти'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={fillDemo}
                >
                  Заполнить demo-доступ
                </Button>
              </form>

              <div className="mt-5 rounded-md bg-muted p-3 text-xs text-muted-foreground">
                Демо-вход: <span className="font-medium">{DEMO_LOGIN}</span> /{' '}
                <span className="font-medium">{DEMO_ID}</span> /{' '}
                <span className="font-medium">{DEMO_PASSWORD}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </main>
  )
}
