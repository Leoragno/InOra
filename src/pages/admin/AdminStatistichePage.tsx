import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import * as profilesService from '../../services/profilesService'
import * as statsService from '../../services/statsService'
import type { StatsResult } from '../../services/statsService'
import { scopedOratories } from '../../utils/authz'
import { Card } from '../../components/Card'
import { Button } from '../../components/Button'
import { SelectInput, TextInput } from '../../components/Field'
import { Avatar } from '../../components/Avatar'
import { BarChart } from '../../components/BarChart'
import { Spinner } from '../../components/Feedback'
import { formatDurationMinutes } from '../../lib/format'
import type { OratoryId, Profile } from '../../types'

const ORATORY_LABEL: Record<OratoryId, string> = { jerago: 'Jerago', besnate: 'Besnate' }

function toIsoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function defaultRange() {
  const now = new Date()
  return { dal: toIsoDate(new Date(now.getFullYear(), now.getMonth(), 1)), al: toIsoDate(now) }
}

const MEDAL_CLASS = ['bg-warn-500 text-white', 'bg-slate-300 text-white', 'bg-[#cd7f32] text-white']

export function AdminStatistichePage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const allowed = useMemo(() => (user ? scopedOratories(user) : []), [user])

  const [oratoryFilter, setOratoryFilter] = useState<OratoryId | null>(null)
  const [animatoreFilter, setAnimatoreFilter] = useState<string>('')
  const [range, setRange] = useState(defaultRange)
  const [animatori, setAnimatori] = useState<Profile[]>([])
  const [stats, setStats] = useState<StatsResult | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    setAnimatoreFilter('')
    profilesService.listAnimatori(user).then((rows) =>
      setAnimatori(rows.filter((r) => r.status === 'active' && (!oratoryFilter || r.oratoryId === oratoryFilter))),
    )
  }, [user, oratoryFilter])

  const load = () => {
    if (!user) return
    setLoading(true)
    statsService
      .getStats(user, { dal: range.dal, al: range.al, oratoryId: oratoryFilter, animatoreId: animatoreFilter || null })
      .then((res) => { setStats(res); setLoading(false) })
  }

  useEffect(load, [user]) // eslint-disable-line react-hooks/exhaustive-deps

  function reset() {
    setOratoryFilter(null)
    setAnimatoreFilter('')
    setRange(defaultRange())
  }

  if (!user) return null

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4 px-5 py-5 lg:max-w-5xl lg:px-8 lg:py-7">
      <div className="text-[20px] font-extrabold text-ink-950">Statistiche</div>

      <Card className="flex flex-col gap-3.5">
        {allowed.length > 1 && (
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => setOratoryFilter(null)}
              className={`rounded-lg px-3 py-2 text-xs font-bold ${!oratoryFilter ? 'bg-ink-950 text-white' : 'border border-slate-200 text-slate-500'}`}
            >
              Tutti
            </button>
            {allowed.map((o) => (
              <button
                key={o}
                onClick={() => setOratoryFilter(o)}
                className={`rounded-lg px-3 py-2 text-xs font-bold ${oratoryFilter === o ? 'bg-ink-950 text-white' : 'border border-slate-200 text-slate-500'}`}
              >
                {ORATORY_LABEL[o]}
              </button>
            ))}
          </div>
        )}

        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          <TextInput type="date" value={range.dal} onChange={(e) => setRange((r) => ({ ...r, dal: e.target.value }))} />
          <TextInput type="date" value={range.al} onChange={(e) => setRange((r) => ({ ...r, al: e.target.value }))} />
          <SelectInput className="col-span-2" value={animatoreFilter} onChange={(e) => setAnimatoreFilter(e.target.value)}>
            <option value="">Tutti gli animatori</option>
            {animatori.map((a) => (
              <option key={a.id} value={a.id}>{a.firstName} {a.lastName}</option>
            ))}
          </SelectInput>
        </div>

        <div className="flex gap-2">
          <Button className="!flex-1 !py-2.5 !text-[13px]" onClick={load} loading={loading}>Applica</Button>
          <Button className="!flex-1 !py-2.5 !text-[13px]" variant="secondary" onClick={reset}>Reset</Button>
        </div>
      </Card>

      {loading || !stats ? (
        <Spinner />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Kpi value={stats.kpi.animatoriAttivi} label="Animatori attivi" />
            <Kpi value={stats.kpi.giorniAttivi} label="Giorni attivi" />
            <Kpi value={stats.kpi.totTimbrature} label="Timbrature" />
            <Kpi value={formatDurationMinutes(stats.kpi.totMinuti)} label="Ore totali" />
          </div>

          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            <Card>
              <div className="mb-3 text-[13px] font-extrabold text-ink-950">Ingressi per fascia oraria</div>
              <BarChart data={stats.hourlyIn} color="#10b981" formatValue={(v) => `${v} ingress${v === 1 ? 'o' : 'i'}`} />
            </Card>
            <Card>
              <div className="mb-3 text-[13px] font-extrabold text-ink-950">Uscite per fascia oraria</div>
              <BarChart data={stats.hourlyOut} color="#ef4444" formatValue={(v) => `${v} uscit${v === 1 ? 'a' : 'e'}`} />
            </Card>
          </div>

          <Card>
            <div className="mb-3 text-[13px] font-extrabold text-ink-950">Presenze per giorno</div>
            <BarChart data={stats.byDay} color="#4f46e5" height={160} formatValue={(v) => `${v} present${v === 1 ? 'e' : 'i'}`} />
          </Card>

          <Card className="!p-0 overflow-hidden">
            <div className="border-b border-slate-100 px-5 py-3.5 text-[13px] font-extrabold text-ink-950">Classifica ore</div>
            {stats.rank.length === 0 ? (
              <div className="px-5 py-8 text-center text-sm text-slate-400">Nessun dato nel periodo selezionato</div>
            ) : (
              <ul className="divide-y divide-slate-50">
                {stats.rank.map((r, i) => {
                  const maxMin = stats.rank[0].minuti || 1
                  return (
                    <li key={r.profile.id}>
                      <button
                        onClick={() => navigate(`/admin/animatori/${r.profile.id}`)}
                        className="flex w-full items-center gap-3 px-5 py-3.5 text-left hover:bg-slate-50"
                      >
                        <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-extrabold ${MEDAL_CLASS[i] ?? 'bg-slate-100 text-slate-500'}`}>
                          {i + 1}
                        </span>
                        <Avatar firstName={r.profile.firstName} lastName={r.profile.lastName} avatarUrl={r.profile.avatarUrl} size={30} />
                        <span className="flex-1 min-w-0">
                          <span className="block truncate text-[13.5px] font-bold text-ink-950">{r.profile.firstName} {r.profile.lastName}</span>
                          <span className="block text-xs text-slate-400">{r.giorni} giorn{r.giorni === 1 ? 'o' : 'i'}</span>
                        </span>
                        <span className="hidden h-1.5 w-24 shrink-0 overflow-hidden rounded-full bg-slate-100 sm:block">
                          <span className="block h-full rounded-full bg-brand-500" style={{ width: `${Math.round((r.minuti / maxMin) * 100)}%` }} />
                        </span>
                        <span className="shrink-0 text-[13px] font-extrabold text-ink-950">{formatDurationMinutes(r.minuti)}</span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </Card>

          <Card className="!p-0 overflow-hidden">
            <div className="border-b border-slate-100 px-5 py-3.5 text-[13px] font-extrabold text-ink-950">Dettaglio animatori</div>
            {stats.detail.length === 0 ? (
              <div className="px-5 py-8 text-center text-sm text-slate-400">Nessun dato nel periodo selezionato</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] text-left text-[12.5px]">
                  <thead>
                    <tr className="bg-slate-50 text-xs font-bold text-slate-400">
                      <th className="px-4 py-2.5">Animatore</th>
                      <th className="px-3 py-2.5 text-right">Giorni</th>
                      <th className="px-3 py-2.5 text-right">Ore</th>
                      <th className="px-3 py-2.5 text-right">Ingressi</th>
                      <th className="px-3 py-2.5 text-right">Uscite</th>
                      <th className="px-4 py-2.5">Ultima timbratura</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.detail.map((r) => (
                      <tr
                        key={r.profile.id}
                        onClick={() => navigate(`/admin/animatori/${r.profile.id}`)}
                        className="cursor-pointer border-t border-slate-50 hover:bg-slate-50"
                      >
                        <td className="px-4 py-2.5 font-bold text-ink-950">{r.profile.firstName} {r.profile.lastName}</td>
                        <td className="px-3 py-2.5 text-right">{r.giorni}</td>
                        <td className="px-3 py-2.5 text-right font-bold text-ink-950">{formatDurationMinutes(r.minuti)}</td>
                        <td className="px-3 py-2.5 text-right text-good-700">{r.nIn}</td>
                        <td className="px-3 py-2.5 text-right text-bad-600">{r.nOut}</td>
                        <td className="px-4 py-2.5 text-slate-500">
                          {r.ultimo ? new Date(r.ultimo.timestamp).toLocaleString('it-IT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  )
}

function Kpi({ value, label }: { value: string | number; label: string }) {
  return (
    <Card className="animate-up !p-4">
      <div className="text-[24px] font-extrabold text-ink-950">{value}</div>
      <div className="text-[12px] font-semibold text-slate-500">{label}</div>
    </Card>
  )
}
