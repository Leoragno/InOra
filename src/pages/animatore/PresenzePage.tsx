import { useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import * as timeEntriesService from '../../services/timeEntriesService'
import { groupSessionsByDay, dayTotalMinutes, isDayOpen } from '../../lib/timeSessions'
import { Card } from '../../components/Card'
import { EmptyState, Spinner } from '../../components/Feedback'
import { formatDayMonth, formatDurationMinutes, formatMonthYear, formatTime } from '../../lib/format'
import type { TimeEntry } from '../../types'

export function PresenzePage() {
  const { user } = useAuth()
  const now = new Date()
  const [viewYear, setViewYear] = useState(now.getFullYear())
  const [viewMonth, setViewMonth] = useState(now.getMonth())
  const [loading, setLoading] = useState(true)
  const [monthEntries, setMonthEntries] = useState<TimeEntry[]>([])
  const [recentEntries, setRecentEntries] = useState<TimeEntry[]>([])

  useEffect(() => {
    if (!user) return
    setLoading(true)
    const monthStart = new Date(viewYear, viewMonth, 1)
    const monthEnd = new Date(viewYear, viewMonth + 1, 0, 23, 59, 59)
    const recentStart = new Date(now)
    recentStart.setDate(recentStart.getDate() - 6)
    recentStart.setHours(0, 0, 0, 0)
    Promise.all([
      timeEntriesService.listEntriesForUser(user.id, monthStart, monthEnd),
      timeEntriesService.listEntriesForUser(user.id, recentStart, new Date()),
    ]).then(([m, r]) => {
      setMonthEntries(m)
      setRecentEntries(r)
      setLoading(false)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, viewYear, viewMonth])

  const days = useMemo(() => groupSessionsByDay(monthEntries), [monthEntries])
  const monthTotalMinutes = days.reduce((sum, d) => sum + dayTotalMinutes(d), 0)

  const weekDays = useMemo(() => groupSessionsByDay(recentEntries), [recentEntries])
  const weekTotalMinutes = weekDays.reduce((sum, d) => sum + dayTotalMinutes(d), 0)

  const bars = useMemo(() => {
    const byDay = new Map(weekDays.map((d) => [d.dateKey, d]))
    const out: { minutes: number }[] = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now)
      d.setDate(d.getDate() - i)
      const g = byDay.get(d.toDateString())
      out.push({ minutes: g ? dayTotalMinutes(g) : 0 })
    }
    return out
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekDays])
  const maxMinutes = Math.max(60, ...bars.map((b) => b.minutes))

  function shiftMonth(delta: number) {
    const d = new Date(viewYear, viewMonth + delta, 1)
    setViewYear(d.getFullYear())
    setViewMonth(d.getMonth())
  }

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-4 px-5 pb-6 pt-5 lg:max-w-2xl lg:px-8 lg:pt-8">
      <div className="text-[22px] font-extrabold text-ink-950">Le mie presenze</div>

      <div className="flex items-center justify-between">
        <button onClick={() => shiftMonth(-1)} className="flex h-8 w-8 items-center justify-center rounded-[10px] border border-slate-200 bg-white text-slate-600"><ChevronLeft size={16} /></button>
        <div className="text-[14.5px] font-bold text-ink-950">{formatMonthYear(viewYear, viewMonth)}</div>
        <button onClick={() => shiftMonth(1)} className="flex h-8 w-8 items-center justify-center rounded-[10px] border border-slate-200 bg-white text-slate-600"><ChevronRight size={16} /></button>
      </div>

      <Card className="animate-up flex items-end justify-between gap-3.5 border-[1.5px] border-good-100 bg-gradient-to-br from-good-50 to-[#d6f5e9] shadow-[0_10px_26px_rgba(16,185,129,0.14)]">
        <div>
          <div className="text-[30px] font-extrabold tracking-tight text-good-900">{formatDurationMinutes(monthTotalMinutes)}</div>
          <div className="mt-1 text-[12.5px] font-semibold text-good-700">Ore totali</div>
        </div>
        <div className="flex h-[52px] items-end gap-[5px]">
          {bars.map((b, i) => (
            <span
              key={i}
              className="w-[9px] animate-grow rounded-t-[4px] rounded-b-[2px] bg-good-500 origin-bottom"
              style={{ height: `${Math.max(6, (b.minutes / maxMinutes) * 52)}px`, opacity: 0.45 + i * 0.08 }}
            />
          ))}
        </div>
      </Card>

      <Card className="flex items-center justify-between">
        <div>
          <div className="text-[12.5px] font-semibold text-slate-400">Questa settimana</div>
          <div className="mt-0.5 text-[19px] font-extrabold text-ink-950">{formatDurationMinutes(weekTotalMinutes)}</div>
        </div>
        <div className="h-[38px] w-[38px] rounded-xl bg-brand-50" />
      </Card>

      {loading ? (
        <Spinner />
      ) : days.length === 0 ? (
        <EmptyState title="Nessuna presenza questo mese" subtitle="Le timbrature registrate compariranno qui." />
      ) : (
        <div className="flex flex-col gap-2.5">
          {days.map((d) => {
            const dm = formatDayMonth(d.date.toISOString())
            const first = d.sessions[0]
            const last = d.sessions[d.sessions.length - 1]
            const open = isDayOpen(d)
            const minutes = dayTotalMinutes(d)
            return (
              <Card key={d.dateKey} className="animate-up flex items-center gap-3.5 !p-3.5">
                <div className="min-w-[34px] text-center">
                  <div className="text-[15px] font-extrabold text-ink-950">{dm.day}</div>
                  <div className="text-[9.5px] font-bold tracking-wide text-slate-400">{dm.month}</div>
                </div>
                <div className="h-[7px] w-[7px] shrink-0 rounded-full bg-good-500" />
                <div className="flex-1 text-[13.5px] font-semibold text-slate-600">
                  {formatTime(first.entry.timestamp)} → {last.exit ? formatTime(last.exit.timestamp) : 'in corso'}
                  {d.sessions.length > 1 && <span className="ml-1.5 text-[11px] font-bold text-slate-400">· {d.sessions.length} turni</span>}
                </div>
                <div className="text-[13.5px] font-extrabold text-ink-950">{open && minutes === 0 ? 'in corso' : formatDurationMinutes(minutes)}</div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
