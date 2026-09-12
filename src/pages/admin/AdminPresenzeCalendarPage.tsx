import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Download } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import * as profilesService from '../../services/profilesService'
import * as timeEntriesService from '../../services/timeEntriesService'
import { scopedOratories } from '../../utils/authz'
import { Button } from '../../components/Button'
import { Spinner } from '../../components/Feedback'
import { weekdayShort } from '../../lib/format'
import type { OratoryId, Profile } from '../../types'

function startOfWeek(d: Date): Date {
  const date = new Date(d)
  const day = (date.getDay() + 6) % 7 // Monday = 0
  date.setDate(date.getDate() - day)
  date.setHours(0, 0, 0, 0)
  return date
}

const ORATORY_LABEL: Record<OratoryId, string> = { jerago: 'Jerago', besnate: 'Besnate' }

export function AdminPresenzeCalendarPage() {
  const { user } = useAuth()
  const allowed = user ? scopedOratories(user) : []
  const [oratoryFilter, setOratoryFilter] = useState<OratoryId | 'tutti'>(allowed.length > 1 ? 'tutti' : allowed[0])
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()))
  const [animatori, setAnimatori] = useState<Profile[] | null>(null)
  const [presenceByUser, setPresenceByUser] = useState<Record<string, boolean[]>>({})
  const [loading, setLoading] = useState(true)

  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart); d.setDate(d.getDate() + i); return d
  }), [weekStart])
  const weekEnd = weekDays[6]

  useEffect(() => {
    if (!user) return
    setLoading(true)
    profilesService.listAnimatori(user).then(async (rows) => {
      const active = rows.filter((r) => r.status === 'active' && (oratoryFilter === 'tutti' || r.oratoryId === oratoryFilter))
      setAnimatori(active)
      const results: Record<string, boolean[]> = {}
      for (const a of active) {
        const entries = await timeEntriesService.listEntriesForUser(a.id, weekStart, new Date(weekEnd.getTime() + 86399000))
        const daysWithEntry = new Set(entries.map((e) => new Date(e.timestamp).toDateString()))
        results[a.id] = weekDays.map((d) => daysWithEntry.has(d.toDateString()))
      }
      setPresenceByUser(results)
      setLoading(false)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, oratoryFilter, weekStart])

  function exportCsv() {
    if (!animatori) return
    const header = ['Animatore', ...weekDays.map((d) => d.toLocaleDateString('it-IT'))]
    const lines = [header.join(';')]
    for (const a of animatori) {
      const row = [`${a.firstName} ${a.lastName}`, ...(presenceByUser[a.id] ?? []).map((p) => (p ? 'Presente' : '—'))]
      lines.push(row.join(';'))
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `presenze_${weekStart.toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex flex-col gap-4 px-5 py-5 lg:px-8 lg:py-7">
      <div className="flex flex-wrap items-center gap-2.5">
        <Chip>{weekStart.toLocaleDateString('it-IT')} → {weekEnd.toLocaleDateString('it-IT')}</Chip>
        {allowed.length > 1 && (
          <div className="flex gap-1.5">
            <button onClick={() => setOratoryFilter('tutti')} className={`rounded-lg px-3 py-2 text-xs font-bold ${oratoryFilter === 'tutti' ? 'bg-ink-950 text-white' : 'border border-slate-200 text-slate-500'}`}>Tutti</button>
            {allowed.map((o) => (
              <button key={o} onClick={() => setOratoryFilter(o)} className={`rounded-lg px-3 py-2 text-xs font-bold ${oratoryFilter === o ? 'bg-ink-950 text-white' : 'border border-slate-200 text-slate-500'}`}>{ORATORY_LABEL[o]}</button>
            ))}
          </div>
        )}
        <div className="flex-1" />
        <button onClick={() => setWeekStart((d) => { const n = new Date(d); n.setDate(n.getDate() - 7); return n })} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-500">‹ Sett.</button>
        <button onClick={() => setWeekStart((d) => { const n = new Date(d); n.setDate(n.getDate() + 7); return n })} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-500">Sett. ›</button>
        <Button className="!px-4 !py-2.5 !text-[13px]" icon={<Download size={14} />} onClick={exportCsv}>Esporta CSV</Button>
      </div>

      {loading || !animatori ? (
        <Spinner />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
          <div className="grid min-w-[560px]" style={{ gridTemplateColumns: '180px repeat(7, 1fr)' }}>
            <div className="border-b border-slate-100 bg-slate-50 px-4 py-3 text-xs font-bold text-slate-400">Animatore</div>
            {weekDays.map((d) => (
              <div key={d.toISOString()} className="border-b border-slate-100 bg-slate-50 px-2 py-3 text-center text-xs font-bold text-slate-400">{weekdayShort(d)} {d.getDate()}</div>
            ))}
            {animatori.map((a) => (
              <FragmentRow key={a.id} name={`${a.firstName} ${a.lastName}`} values={presenceByUser[a.id] ?? weekDays.map(() => false)} />
            ))}
            {animatori.length === 0 && <div className="col-span-8 py-8 text-center text-sm text-slate-400">Nessun animatore.</div>}
          </div>
        </div>
      )}
    </div>
  )
}

function FragmentRow({ name, values }: { name: string; values: boolean[] }) {
  const today = new Date()
  return (
    <>
      <div className="border-b border-slate-50 px-4 py-3 text-[13.5px] font-semibold text-ink-950">{name}</div>
      {values.map((present, i) => {
        const day = new Date(); day.setDate(today.getDate() - ((today.getDay() + 6) % 7) + i)
        const future = day > today
        return (
          <div key={i} className="border-b border-slate-50 px-2 py-3 text-center text-sm font-bold" style={{ color: present ? '#10b981' : future ? '#cbd5e1' : '#ef4444' }}>
            {present ? '✓' : future ? '–' : '✕'}
          </div>
        )
      })}
    </>
  )
}

function Chip({ children }: { children: ReactNode }) {
  return <span className="rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-[13px] font-semibold text-slate-600">{children}</span>
}
