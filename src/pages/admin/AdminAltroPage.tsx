import { useNavigate } from 'react-router-dom'
import { BarChart3, ChevronRight, LogOut, Settings } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { Avatar } from '../../components/Avatar'
import { Card } from '../../components/Card'

const LABELS: Record<string, string> = {
  admin_jerago: 'Admin Jerago', admin_besnate: 'Admin Besnate', admin_general: 'Admin Generale',
}

export function AdminAltroPage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  if (!user) return null

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-5 px-5 py-5">
      <div className="flex items-center gap-3">
        <Avatar firstName={user.firstName} lastName={user.lastName} avatarUrl={user.avatarUrl} size={48} />
        <div>
          <div className="text-base font-extrabold text-ink-950">{user.firstName} {user.lastName}</div>
          <div className="text-[12.5px] text-slate-500">{LABELS[user.role]}</div>
        </div>
      </div>

      <Card className="!p-0 overflow-hidden">
        <button onClick={() => navigate('/admin/statistiche')} className="flex w-full items-center gap-3 border-b border-slate-100 px-4 py-4 text-left hover:bg-slate-50">
          <span className="flex h-[26px] w-[26px] items-center justify-center rounded-lg bg-gradient-to-br from-brand-500 to-accent-cyan text-white"><BarChart3 size={14} /></span>
          <span className="flex-1 text-sm font-semibold text-ink-950">Statistiche</span>
          <ChevronRight size={16} className="text-slate-300" />
        </button>
        <button onClick={() => navigate('/admin/gps')} className="flex w-full items-center gap-3 px-4 py-4 text-left hover:bg-slate-50">
          <span className="flex h-[26px] w-[26px] items-center justify-center rounded-lg bg-gradient-to-br from-brand-500 to-accent-cyan text-white"><Settings size={14} /></span>
          <span className="flex-1 text-sm font-semibold text-ink-950">Impostazioni GPS</span>
          <ChevronRight size={16} className="text-slate-300" />
        </button>
      </Card>

      <button onClick={logout} className="flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-[14px] font-bold text-bad-600 hover:bg-bad-50">
        <LogOut size={16} /> Esci
      </button>
    </div>
  )
}
