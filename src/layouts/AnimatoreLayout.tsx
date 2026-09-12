import { Home, Clock, FileText, User } from 'lucide-react'
import { AppShell, type NavItem } from '../components/AppShell'
import { useAuth } from '../hooks/useAuth'

const NAV: NavItem[] = [
  { to: '/', label: 'Home', icon: <Home size={17} />, end: true },
  { to: '/presenze', label: 'Presenze', icon: <Clock size={17} /> },
  { to: '/moduli', label: 'Moduli', icon: <FileText size={17} /> },
  { to: '/profilo', label: 'Profilo', icon: <User size={17} /> },
]

export function AnimatoreLayout() {
  const { user } = useAuth()
  return <AppShell navItems={NAV} sidebarFooterLabel={user?.oratoryId === 'jerago' ? 'Jerago · Animatore' : 'Besnate · Animatore'} />
}
