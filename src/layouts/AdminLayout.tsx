import { LayoutDashboard, Users, CalendarDays, FileText, Settings, BarChart3, MoreHorizontal } from 'lucide-react'
import { AppShell, type NavItem } from '../components/AppShell'
import { useAuth } from '../hooks/useAuth'

const LABELS: Record<string, string> = {
  admin_jerago: 'Admin Jerago',
  admin_besnate: 'Admin Besnate',
  admin_general: 'Admin Generale',
}

export function AdminLayout() {
  const { user } = useAuth()
  if (!user) return null
  const isGeneral = user.role === 'admin_general'

  const desktopNav: NavItem[] = [
    { to: '/admin', label: 'Dashboard', icon: <LayoutDashboard size={17} />, end: true },
    { to: '/admin/animatori', label: 'Animatori', icon: <Users size={17} /> },
    { to: '/admin/presenze', label: 'Presenze', icon: <CalendarDays size={17} /> },
    { to: '/admin/moduli', label: 'Moduli', icon: <FileText size={17} /> },
    { to: '/admin/statistiche', label: 'Statistiche', icon: <BarChart3 size={17} /> },
    { to: '/admin/gps', label: 'Impostazioni', icon: <Settings size={17} /> },
  ]

  const mobileNav: NavItem[] = [
    { to: '/admin', label: 'Dashboard', icon: <LayoutDashboard size={17} />, end: true },
    { to: '/admin/animatori', label: 'Animatori', icon: <Users size={17} /> },
    { to: '/admin/presenze', label: 'Presenze', icon: <CalendarDays size={17} /> },
    { to: '/admin/moduli', label: 'Moduli', icon: <FileText size={17} /> },
    { to: '/admin/altro', label: 'Altro', icon: <MoreHorizontal size={17} /> },
  ]

  return (
    <AppShell
      navItems={desktopNav}
      mobileNavItems={mobileNav}
      sidebarFooterLabel={LABELS[user.role]}
      desktopTitle={isGeneral ? 'Comunità Pastorale' : `Oratorio di ${user.oratoryId === 'jerago' ? 'Jerago' : 'Besnate'}`}
    />
  )
}
