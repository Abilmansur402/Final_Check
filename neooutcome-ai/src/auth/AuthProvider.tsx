import * as React from 'react'
import {
  findDoctorAccount,
  findDoctorByEmail,
  toDoctorSession,
  type DoctorSession,
} from '@/data/doctors'
import { supabase } from '@/lib/supabase'

interface LoginInput {
  login: string
  doctorId: string
  password: string
}

interface LoginResult {
  ok: boolean
  message?: string
}

interface AuthContextValue {
  doctor: DoctorSession | null
  isAuthenticated: boolean
  login: (input: LoginInput) => Promise<LoginResult>
  logout: () => void
}

const STORAGE_KEY = 'neooutcome.doctor.session'
const AuthContext = React.createContext<AuthContextValue | null>(null)

function readStoredDoctor(): DoctorSession | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    const doctor = raw ? (JSON.parse(raw) as DoctorSession) : null
    if (supabase && !doctor?.authUserId) return null
    if (!doctor) return null
    // Refresh display fields (name, role, institution) from the current account list.
    const account = findDoctorAccount(doctor.login, doctor.doctorId)
    return account ? toDoctorSession(account, doctor.authUserId) : doctor
  } catch {
    return null
  }
}

function sessionFromSupabaseUser(user: { id: string; email?: string }) {
  const account = user.email ? findDoctorByEmail(user.email) : undefined
  return account ? toDoctorSession(account, user.id) : null
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [doctor, setDoctor] = React.useState<DoctorSession | null>(() =>
    typeof window === 'undefined' ? null : readStoredDoctor(),
  )

  React.useEffect(() => {
    if (!supabase) return

    let active = true
    void supabase.auth.getSession().then(({ data: { session } }) => {
      if (!active) return
      const nextDoctor = session?.user ? sessionFromSupabaseUser(session.user) : null
      setDoctor(nextDoctor)
      if (nextDoctor) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextDoctor))
    })

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      const nextDoctor = session?.user ? sessionFromSupabaseUser(session.user) : null
      setDoctor(nextDoctor)
      if (nextDoctor) {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextDoctor))
      } else {
        window.localStorage.removeItem(STORAGE_KEY)
      }
    })

    return () => {
      active = false
      data.subscription.unsubscribe()
    }
  }, [])

  const login = React.useCallback(async (input: LoginInput): Promise<LoginResult> => {
    const account = findDoctorAccount(input.login, input.doctorId)
    let authUserId: string | undefined

    if (!account || (!supabase && account.password !== input.password)) {
      return {
        ok: false,
        message: 'Проверьте логин, ID врача и пароль.',
      }
    }

    if (supabase) {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: account.email,
        password: input.password,
      })
      if (error || !data.user) {
        return {
          ok: false,
          message: error?.message ?? 'Не удалось войти через Supabase Auth.',
        }
      }
      authUserId = data.user.id
    }

    const nextDoctor = toDoctorSession(account, authUserId)
    setDoctor(nextDoctor)
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextDoctor))
    return { ok: true }
  }, [])

  const logout = React.useCallback(() => {
    if (supabase) void supabase.auth.signOut()
    setDoctor(null)
    window.localStorage.removeItem(STORAGE_KEY)
  }, [])

  const value = React.useMemo<AuthContextValue>(
    () => ({
      doctor,
      isAuthenticated: doctor !== null,
      login,
      logout,
    }),
    [doctor, login, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = React.useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider')
  }
  return context
}
