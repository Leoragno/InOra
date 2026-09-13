import { useEffect, useState } from 'react'
import { Lock } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { useToast } from '../../hooks/useToast'
import * as availabilityService from '../../services/availabilityService'
import { Card } from '../../components/Card'
import { Button } from '../../components/Button'
import { Spinner, EmptyState } from '../../components/Feedback'
import { GIORNI_DISPONIBILITA } from '../../types'
import type { AvailabilityStatus, AvailabilityWeek } from '../../types'

interface DayState {
  status: AvailabilityStatus | null
  note: string
}

type WeekState = Record<number, DayState>

export function DisponibilitaPage() {
  const { user } = useAuth()
  const toast = useToast()
  const [weeks, setWeeks] = useState<AvailabilityWeek[] | null>(null)
  const [state, setState] = useState<Record<string, WeekState>>({})
  const [saving, setSaving] = useState<string | null>(null)

  useEffect(() => {
    if (!user?.oratoryId) return
    availabilityService.listWeeksForOratory(user.oratoryId).then(async (rows) => {
      setWeeks(rows)
      const responses = await availabilityService.listMyResponses(user.id, rows.map((w) => w.id))
      const next: Record<string, WeekState> = {}
      for (const w of rows) next[w.id] = {}
      for (const r of responses) {
        next[r.weekId] ??= {}
        next[r.weekId][r.dayIndex] = { status: r.status, note: r.note }
      }
      setState(next)
    })
  }, [user])

  if (!user) return null

  function setDay(weekId: string, dayIndex: number, patch: Partial<DayState>) {
    setState((s) => ({
      ...s,
      [weekId]: {
        ...s[weekId],
        [dayIndex]: { status: s[weekId]?.[dayIndex]?.status ?? null, note: s[weekId]?.[dayIndex]?.note ?? '', ...patch },
      },
    }))
  }

  async function saveWeek(week: AvailabilityWeek) {
    if (!user) return
    setSaving(week.id)
    try {
      const days = state[week.id] ?? {}
      await Promise.all(
        week.activeDays.map((dayIndex) => {
          const day = days[dayIndex]
          if (!day || (!day.status && !day.note)) return Promise.resolve()
          return availabilityService.saveResponse(user.id, week.id, dayIndex, day.status, day.note)
        }),
      )
      toast.success('Disponibilità salvate')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Errore nel salvataggio')
    } finally {
      setSaving(null)
    }
  }

  if (!weeks) return <Spinner />

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-4 px-5 pb-6 pt-5 lg:max-w-2xl lg:px-8 lg:pt-8">
      <div className="text-[22px] font-extrabold text-ink-950">Disponibilità</div>

      {weeks.length === 0 ? (
        <EmptyState title="Nessuna settimana pubblicata" subtitle="L'admin non ha ancora aperto nessuna settimana." />
      ) : (
        weeks.map((week) => {
          const days = state[week.id] ?? {}
          return (
            <Card key={week.id} className="animate-up flex flex-col gap-3.5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-[15px] font-extrabold text-ink-950">{week.name}</div>
                  {week.dateInfo && <div className="text-[12.5px] text-slate-500">{week.dateInfo}</div>}
                </div>
                {week.closed && (
                  <span className="flex shrink-0 items-center gap-1 rounded-full bg-bad-50 px-2.5 py-1 text-[11px] font-bold text-bad-600">
                    <Lock size={11} /> Chiuse
                  </span>
                )}
              </div>

              <div className="flex flex-col gap-2.5">
                {week.activeDays.map((dayIndex) => {
                  const day = days[dayIndex] ?? { status: null, note: '' }
                  return (
                    <div key={dayIndex} className="flex flex-col gap-1.5 rounded-xl border border-slate-100 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[13px] font-bold text-ink-950">{GIORNI_DISPONIBILITA[dayIndex]}</span>
                        <div className="flex gap-1.5">
                          <button
                            disabled={week.closed}
                            onClick={() => setDay(week.id, dayIndex, { status: 'disponibile' })}
                            className={`rounded-lg px-3 py-1.5 text-[12px] font-bold transition-colors disabled:opacity-50 ${
                              day.status === 'disponibile' ? 'bg-good-500 text-white' : 'border border-slate-200 text-slate-500'
                            }`}
                          >
                            Sì
                          </button>
                          <button
                            disabled={week.closed}
                            onClick={() => setDay(week.id, dayIndex, { status: 'non_disponibile' })}
                            className={`rounded-lg px-3 py-1.5 text-[12px] font-bold transition-colors disabled:opacity-50 ${
                              day.status === 'non_disponibile' ? 'bg-bad-500 text-white' : 'border border-slate-200 text-slate-500'
                            }`}
                          >
                            No
                          </button>
                        </div>
                      </div>
                      <input
                        disabled={week.closed}
                        value={day.note}
                        onChange={(e) => setDay(week.id, dayIndex, { note: e.target.value })}
                        placeholder="Note (opzionale)"
                        className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-[12.5px] text-ink-950 outline-none disabled:opacity-50"
                      />
                    </div>
                  )
                })}
              </div>

              <Button onClick={() => saveWeek(week)} loading={saving === week.id} disabled={week.closed} fullWidth>
                {week.closed ? 'Disponibilità chiuse' : 'Salva settimana'}
              </Button>
            </Card>
          )
        })
      )}
    </div>
  )
}
