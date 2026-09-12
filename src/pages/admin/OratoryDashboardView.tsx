import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import * as dashboardService from '../../services/dashboardService'
import type { OratoryDashboard } from '../../services/dashboardService'
import { Card } from '../../components/Card'
import { Spinner } from '../../components/Feedback'
import { formatTime } from '../../lib/format'
import type { OratoryId } from '../../types'

function timeAgo(iso: string): string {
  const diffMin = Math.round((Date.now() - new Date(iso).getTime()) / 60000)
  if (diffMin < 1) return 'ora'
  if (diffMin < 60) return `${diffMin} min fa`
  const h = Math.round(diffMin / 60)
  return `${h}h fa`
}

export function OratoryDashboardView({ oratoryId }: { oratoryId: OratoryId }) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [data, setData] = useState<OratoryDashboard | null>(null)

  useEffect(() => {
    if (!user) return
    setData(null)
    dashboardService.getOratoryDashboard(user, oratoryId).then(setData)
  }, [user, oratoryId])

  if (!data) return <Spinner />

  const presentPct = data.totalAnimatori ? Math.round((data.presentToday / data.totalAnimatori) * 100) : 0
  const absentPct = 100 - presentPct

  return (
    <div className="flex flex-col gap-5 px-5 py-5 lg:px-8 lg:py-7">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="animate-up">
          <div className="text-[34px] font-extrabold tracking-tight text-good-500">{data.presentToday}</div>
          <div className="mt-0.5 text-[13px] font-semibold text-slate-500">Presenti oggi</div>
          <div className="mt-3.5 h-[6px] overflow-hidden rounded-full bg-slate-100">
            <div className="h-full origin-left animate-grow rounded-full bg-gradient-to-r from-good-500 to-[#5eead4]" style={{ width: `${presentPct}%` }} />
          </div>
        </Card>
        <Card className="animate-up">
          <div className="text-[34px] font-extrabold tracking-tight text-bad-500">{data.absentToday}</div>
          <div className="mt-0.5 text-[13px] font-semibold text-slate-500">Assenti</div>
          <div className="mt-3.5 h-[6px] overflow-hidden rounded-full bg-slate-100">
            <div className="h-full origin-left animate-grow rounded-full bg-gradient-to-r from-bad-500 to-bad-100" style={{ width: `${absentPct}%` }} />
          </div>
        </Card>
        <Card className="animate-up flex items-end justify-between gap-3 bg-gradient-to-br from-ink-900 to-[#25306b] text-white">
          <div>
            <div className="text-[34px] font-extrabold tracking-tight">{data.monthHours}h</div>
            <div className="mt-0.5 text-[13px] font-semibold text-slate-300">Ore questo mese</div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.5fr_1fr] lg:items-start">
        <Card className="!p-5">
          <div className="flex items-center justify-between">
            <div className="text-[15px] font-extrabold text-ink-950">Presenze oggi</div>
            <button onClick={() => navigate('/admin/animatori')} className="text-[12.5px] font-bold text-brand-600">Vedi tutte →</button>
          </div>
          <div className="mt-3 flex flex-col">
            {data.presences.length === 0 && <div className="py-6 text-center text-[13px] text-slate-400">Nessun animatore in questo oratorio.</div>}
            {data.presences.map((p) => (
              <div key={p.profile.id} className="flex items-center gap-3 border-b border-slate-100 py-2.5 last:border-0">
                <span className={`h-2 w-2 rounded-full ${p.present ? 'bg-good-500' : 'bg-bad-500'}`} />
                <span className="flex-1 text-[13.5px] font-semibold text-ink-950">{p.profile.firstName} {p.profile.lastName}</span>
                <span className="text-[13px] font-bold text-slate-500">{p.entryTime ? formatTime(p.entryTime) : 'Non presente'}</span>
              </div>
            ))}
          </div>
        </Card>

        <div className="flex flex-col gap-4">
          <Card>
            <div className="text-[15px] font-extrabold text-ink-950">Statistiche</div>
            <div className="mt-3.5 flex flex-col gap-2.5 text-[13.5px] font-semibold text-slate-500">
              <div className="flex justify-between"><span>Animatori</span><span className="font-extrabold text-ink-950">{data.totalAnimatori}</span></div>
              <div className="flex justify-between"><span>Moduli attivi</span><span className="font-extrabold text-ink-950">{data.activeFormsCount}</span></div>
              <div className="flex justify-between"><span>Media ore</span><span className="font-extrabold text-ink-950">{data.totalAnimatori ? Math.round((data.monthHours / data.totalAnimatori) * 10) / 10 : 0}h</span></div>
            </div>
          </Card>
          <Card>
            <div className="text-[15px] font-extrabold text-ink-950">Attività recente</div>
            <div className="mt-3 flex flex-col gap-2.5">
              {data.recentActivity.length === 0 && <div className="text-[12.5px] text-slate-400">Nessuna attività recente.</div>}
              {data.recentActivity.map((a) => (
                <div key={a.id} className="text-[12.5px] leading-relaxed text-slate-500">
                  <strong className="text-ink-950">{a.text}</strong>
                  <br />{timeAgo(a.time)}
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
