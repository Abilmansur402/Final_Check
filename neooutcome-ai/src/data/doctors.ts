export interface DoctorAccount {
  login: string
  email: string
  doctorId: string
  password: string
  name: string
  role: string
  institution: string
  region: string
}

export interface DoctorSession {
  login: string
  email: string
  doctorId: string
  authUserId?: string
  name: string
  role: string
  institution: string
  region: string
}

export const DOCTOR_ACCOUNTS: DoctorAccount[] = [
  {
    login: 'doctor.karimova',
    email: 'doctor.karimova@neooutcome.demo',
    doctorId: 'KZ-NICU-001',
    password: 'NeoDemo2026!',
    name: 'Д-р А. Каримова',
    role: 'Врач-неонатолог ОРИТН',
    institution: 'Национальный научный центр материнства и детства',
    region: 'г. Астана',
  },
  {
    login: 'doctor.sadykov',
    email: 'doctor.sadykov@neooutcome.demo',
    doctorId: 'KZ-NICU-002',
    password: 'NeoDemo2026!',
    name: 'Д-р М. Садыков',
    role: 'Региональный неонатолог',
    institution: 'Неонатальная служба Казахстана',
    region: 'Кызылординская',
  },
]

export function findDoctorAccount(login: string, doctorId: string) {
  return DOCTOR_ACCOUNTS.find(
    (candidate) =>
      candidate.login.toLowerCase() === login.trim().toLowerCase() &&
      candidate.doctorId.toLowerCase() === doctorId.trim().toLowerCase(),
  )
}

export function findDoctorByEmail(email: string) {
  return DOCTOR_ACCOUNTS.find(
    (candidate) => candidate.email.toLowerCase() === email.toLowerCase(),
  )
}

export function toDoctorSession(
  account: DoctorAccount,
  authUserId?: string,
): DoctorSession {
  return {
    login: account.login,
    email: account.email,
    doctorId: account.doctorId,
    authUserId,
    name: account.name,
    role: account.role,
    institution: account.institution,
    region: account.region,
  }
}
