import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useAuth } from '@/auth/AuthProvider'
import { DashboardContainer } from '@/components/layout/DashboardContainer'
import { WelcomeDashboard } from '@/pages/WelcomeDashboard'
import { PatientCommandCenter } from '@/pages/PatientCommandCenter'
import { RegionalDashboard } from '@/pages/RegionalDashboard'
import { LoginPage } from '@/pages/LoginPage'
import { InteractiveMapPage } from '@/pages/InteractiveMapPage'
import { PatientIntakePage } from '@/pages/PatientIntakePage'

function ProtectedDashboard() {
  const { isAuthenticated } = useAuth()
  const location = useLocation()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  return <DashboardContainer />
}

export default function App() {
  return (
    <Routes>
      <Route path="login" element={<LoginPage />} />
      <Route element={<ProtectedDashboard />}>
        <Route index element={<WelcomeDashboard />} />
        <Route path="patient" element={<PatientCommandCenter />} />
        <Route path="patient/:patientId" element={<PatientCommandCenter />} />
        <Route path="intake" element={<PatientIntakePage />} />
        <Route path="regional" element={<RegionalDashboard />} />
        <Route path="regional-map" element={<InteractiveMapPage />} />
      </Route>
    </Routes>
  )
}
