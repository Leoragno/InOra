import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { ToastProvider } from './contexts/ToastContext'
import { RequireAuth, RequireRole, RedirectIfAuthed } from './components/guards'
import { ConnectionIndicator } from './components/ConnectionIndicator'

import { LoginPage } from './pages/LoginPage'
import { RegisterPage } from './pages/RegisterPage'

import { AnimatoreLayout } from './layouts/AnimatoreLayout'
import { HomePage } from './pages/animatore/HomePage'
import { PresenzePage } from './pages/animatore/PresenzePage'
import { DisponibilitaPage } from './pages/animatore/DisponibilitaPage'
import { ModuliPage } from './pages/animatore/ModuliPage'
import { ModuloCompilaPage } from './pages/animatore/ModuloCompilaPage'
import { ProfiloPage } from './pages/animatore/ProfiloPage'

import { AdminLayout } from './layouts/AdminLayout'
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage'
import { AdminSedeDetailPage } from './pages/admin/AdminSedeDetailPage'
import { AdminAnimatoriPage } from './pages/admin/AdminAnimatoriPage'
import { AdminAnimatoreDetailPage } from './pages/admin/AdminAnimatoreDetailPage'
import { AdminGpsPage } from './pages/admin/AdminGpsPage'
import { AdminModuliPage } from './pages/admin/AdminModuliPage'
import { AdminModuloNuovoPage } from './pages/admin/AdminModuloNuovoPage'
import { AdminModuloRisultatiPage } from './pages/admin/AdminModuloRisultatiPage'
import { AdminPresenzeCalendarPage } from './pages/admin/AdminPresenzeCalendarPage'
import { AdminDisponibilitaPage } from './pages/admin/AdminDisponibilitaPage'
import { AdminStatistichePage } from './pages/admin/AdminStatistichePage'
import { AdminQrPage } from './pages/admin/AdminQrPage'
import { AdminNotifichePage } from './pages/admin/AdminNotifichePage'
import { AdminAltroPage } from './pages/admin/AdminAltroPage'

const ADMIN_ROLES = ['admin_jerago', 'admin_besnate', 'admin_general'] as const

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <ConnectionIndicator />
          <Routes>
            <Route path="/login" element={<RedirectIfAuthed><LoginPage /></RedirectIfAuthed>} />
            <Route path="/registrati" element={<RedirectIfAuthed><RegisterPage /></RedirectIfAuthed>} />

            <Route element={<RequireAuth />}>
              <Route element={<RequireRole roles={['animatore']} />}>
                <Route element={<AnimatoreLayout />}>
                  <Route index element={<HomePage />} />
                  <Route path="presenze" element={<PresenzePage />} />
                  <Route path="disponibilita" element={<DisponibilitaPage />} />
                  <Route path="moduli" element={<ModuliPage />} />
                  <Route path="moduli/:formId" element={<ModuloCompilaPage />} />
                  <Route path="profilo" element={<ProfiloPage />} />
                </Route>
              </Route>

              <Route path="admin" element={<RequireRole roles={[...ADMIN_ROLES]} />}>
                <Route element={<AdminLayout />}>
                  <Route index element={<AdminDashboardPage />} />
                  <Route path="sedi/:oratoryId" element={<AdminSedeDetailPage />} />
                  <Route path="animatori" element={<AdminAnimatoriPage />} />
                  <Route path="animatori/:userId" element={<AdminAnimatoreDetailPage />} />
                  <Route path="gps" element={<AdminGpsPage />} />
                  <Route path="moduli" element={<AdminModuliPage />} />
                  <Route path="moduli/nuovo" element={<AdminModuloNuovoPage />} />
                  <Route path="moduli/:formId/risultati" element={<AdminModuloRisultatiPage />} />
                  <Route path="presenze" element={<AdminPresenzeCalendarPage />} />
                  <Route path="disponibilita" element={<AdminDisponibilitaPage />} />
                  <Route path="statistiche" element={<AdminStatistichePage />} />
                  <Route path="qr" element={<AdminQrPage />} />
                  <Route path="notifiche" element={<AdminNotifichePage />} />
                  <Route path="altro" element={<AdminAltroPage />} />
                </Route>
              </Route>
            </Route>

            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
