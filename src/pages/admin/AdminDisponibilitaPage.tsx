import { useEffect, useMemo, useState } from 'react'
import { Lock, Pencil, Plus, Trash2, Unlock } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { useToast } from '../../hooks/useToast'
import * as availabilityService from '../../services/availabilityService'
import * as profilesService from '../../services/profilesService'
import { scopedOratories } from '../../utils/authz'
import { Card } from '../../components/Card'
import { Button } from '../../components/Button'
import { Field, TextInput } from '../../components/Field'
import { Spinner, EmptyState } from '../../components/Feedback'
import { GIORNI_DISPONIBILITA } from '../../types'
import type { AvailabilityResponse, AvailabilityWeek, OratoryId, Profile } from '../../types'
import type { WeekInput } from '../../services/availabilityService'

const ORATORY_LABEL: Record<OratoryId, string> = { jerago: 'Jerago', besnate: 'Besnate' }

const emptyForm: WeekInput = { name: '', dateInfo: '', activeDays: [0, 1, 2, 3, 4] }

export function AdminDisponibilitaPage() {
  const { user } = useAuth()
  const toast = useToast()
  const allowed = useMemo(() => (user ? scopedOratories(user) : []), [user])

  const [oratoryFilter, setOratoryFilter] = useState<OratoryId | null>(null)
  const [weeks, setWeeks] = useState<AvailabilityWeek[] | null>(null)
  const [animatori, setAnimatori] = useState<Profile[]>([])
  const [responses, setResponses] = useState<AvailabilityResponse[]>([])
  const [editing, setEditing] = useState<AvailabilityWeek | 'new' | null>(null)
  const [form, setForm] = useState<WeekInput>(emptyForm)
  const [saving, setSaving] = useState(false)

  const oratoryIds = oratoryFilter ? [oratoryFilter] : allowed

  const load = () => {
    if (!user) return
    Promise.all([
      availabilityService.listWeeksForOratories(oratoryIds),
      profilesService.listAnimatori(user),
    ]).then(async ([w, allAnimatori]) => {
      setWeeks(w)
      const scopedIds = new Set(oratoryIds)
      setAnimatori(allAnimatori.filter((a) => a.status === 'active' && a.oratoryId && scopedIds.has(a.oratoryId)))
      setResponses(await availabilityService.listResponsesForWeeks(w.map((x) => x.id)))
    })
  }
  useEffect(load, [user, oratoryFilter]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!user) return null

  function openNew() {
    setForm({ ...emptyForm })
    setEditing('new')
  }
  function openEdit(week: AvailabilityWeek) {
    setForm({ name: week.name, dateInfo: week.dateInfo, activeDays: week.activeDays })
    setEditing(week)
  }
  function toggleDay(idx: number) {
    setForm((f) => ({
      ...f,
      activeDays: f.activeDays.includes(idx) ? f.activeDays.filter((d) => d !== idx) : [...f.activeDays, idx].sort(),
    }))
  }

  async function saveForm() {
    if (!user || !editing) return
    if (!form.name.trim()) return toast.error('Il nome è obbligatorio')
    setSaving(true)
    try {
      if (editing === 'new') {
        const targetOratory = oratoryFilter ?? allowed[0]
        await availabilityService.createWeek(user, targetOratory, form)
        toast.success('Settimana creata')
      } else {
        await availabilityService.updateWeek(user, editing, form)
        toast.success('Settimana aggiornata')
      }
      setEditing(null)
      load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Errore')
    } finally {
      setSaving(false)
    }
  }

  async function toggleClosed(week: AvailabilityWeek) {
    if (!user) return
    try {
      await availabilityService.toggleWeekClosed(user, week)
      load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Errore')
    }
  }

  async function remove(week: AvailabilityWeek) {
    if (!user) return
    try {
      await availabilityService.deleteWeek(user, week)
      toast.success('Settimana eliminata')
      load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Errore')
    }
  }

  if (!weeks) return <Spinner />

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4 px-5 py-5 lg:px-8 lg:py-7">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-[20px] font-extrabold text-ink-950">Disponibilità</div>
        <Button className="!px-4 !py-2.5 !text-[13px]" icon={<Plus size={14} />} onClick={openNew}>Nuova settimana</Button>
      </div>

      {allowed.length > 1 && (
        <div className="flex gap-1.5">
          <button onClick={() => setOratoryFilter(null)} className={`rounded-lg px-3 py-2 text-xs font-bold ${!oratoryFilter ? 'bg-ink-950 text-white' : 'border border-slate-200 text-slate-500'}`}>Tutti</button>
          {allowed.map((o) => (
            <button key={o} onClick={() => setOratoryFilter(o)} className={`rounded-lg px-3 py-2 text-xs font-bold ${oratoryFilter === o ? 'bg-ink-950 text-white' : 'border border-slate-200 text-slate-500'}`}>{ORATORY_LABEL[o]}</button>
          ))}
        </div>
      )}

      {editing && (
        <Card className="animate-up flex flex-col gap-3">
          <div className="text-[13px] font-extrabold text-ink-950">{editing === 'new' ? 'Nuova settimana' : 'Modifica settimana'}</div>
          <Field label="Nome"><TextInput value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Settimana 1" /></Field>
          <Field label="Date" hint="Testo libero, es. 7-13 luglio"><TextInput value={form.dateInfo} onChange={(e) => setForm((f) => ({ ...f, dateInfo: e.target.value }))} /></Field>
          <Field label="Giorni attivi">
            <div className="flex flex-wrap gap-1.5">
              {GIORNI_DISPONIBILITA.map((g, idx) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => toggleDay(idx)}
                  className={`rounded-lg px-3 py-2 text-[12.5px] font-bold ${form.activeDays.includes(idx) ? 'bg-brand-600 text-white' : 'border border-slate-200 text-slate-500'}`}
                >
                  {g.slice(0, 3)}
                </button>
              ))}
            </div>
          </Field>
          <div className="flex gap-2">
            <Button onClick={saveForm} loading={saving} className="!flex-1">Salva</Button>
            <Button variant="secondary" onClick={() => setEditing(null)} className="!flex-1">Annulla</Button>
          </div>
        </Card>
      )}

      {weeks.length === 0 ? (
        <EmptyState title="Nessuna settimana" subtitle="Crea la prima settimana per raccogliere le disponibilità." />
      ) : (
        weeks.map((week) => {
          const weekResponses = responses.filter((r) => r.weekId === week.id)
          const compiled = new Set(weekResponses.map((r) => r.userId)).size
          return (
            <Card key={week.id} className="animate-up flex flex-col gap-3.5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[15px] font-extrabold text-ink-950">{week.name}</span>
                    {allowed.length > 1 && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10.5px] font-bold text-slate-500">{ORATORY_LABEL[week.oratoryId]}</span>}
                  </div>
                  <div className="text-[12.5px] text-slate-500">{week.dateInfo || '—'} · {week.activeDays.map((d) => GIORNI_DISPONIBILITA[d].slice(0, 3)).join(', ')}</div>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="rounded-full bg-good-50 px-2.5 py-1 text-[11px] font-bold text-good-700">✅ {compiled}/{animatori.filter((a) => a.oratoryId === week.oratoryId).length}</span>
                  <span className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold ${week.closed ? 'bg-bad-50 text-bad-600' : 'bg-good-50 text-good-700'}`}>
                    {week.closed ? <Lock size={11} /> : <Unlock size={11} />} {week.closed ? 'Chiuse' : 'Aperte'}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" className="!px-3 !py-2 !text-[12.5px]" icon={week.closed ? <Unlock size={13} /> : <Lock size={13} />} onClick={() => toggleClosed(week)}>
                  {week.closed ? 'Riapri' : 'Chiudi'}
                </Button>
                <Button variant="secondary" className="!px-3 !py-2 !text-[12.5px]" icon={<Pencil size={13} />} onClick={() => openEdit(week)}>Modifica</Button>
                <Button variant="secondary" className="!px-3 !py-2 !text-[12.5px] hover:!border-bad-500 hover:!text-bad-500" icon={<Trash2 size={13} />} onClick={() => remove(week)}>Elimina</Button>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-100">
                <table className="w-full min-w-[480px] text-left text-[12px]">
                  <thead>
                    <tr className="bg-slate-50 text-[11px] font-bold text-slate-400">
                      <th className="px-3 py-2">Animatore</th>
                      {week.activeDays.map((d) => <th key={d} className="px-2 py-2 text-center">{GIORNI_DISPONIBILITA[d].slice(0, 3)}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {animatori.filter((a) => a.oratoryId === week.oratoryId).map((a) => (
                      <tr key={a.id} className="border-t border-slate-50">
                        <td className="px-3 py-2 font-bold text-ink-950">{a.firstName} {a.lastName}</td>
                        {week.activeDays.map((d) => {
                          const r = weekResponses.find((x) => x.userId === a.id && x.dayIndex === d)
                          return (
                            <td key={d} className="px-2 py-2 text-center">
                              {r?.status === 'disponibile' ? <span className="text-good-600">✅</span> : r?.status === 'non_disponibile' ? <span className="text-bad-600">❌</span> : <span className="text-slate-300">—</span>}
                              {r?.note && <div className="text-[9.5px] italic text-slate-400">{r.note}</div>}
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                    {animatori.filter((a) => a.oratoryId === week.oratoryId).length === 0 && (
                      <tr><td colSpan={week.activeDays.length + 1} className="px-3 py-4 text-center text-slate-400">Nessun animatore</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          )
        })
      )}
    </div>
  )
}
