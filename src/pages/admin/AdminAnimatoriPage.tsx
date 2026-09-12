import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { useToast } from '../../hooks/useToast'
import * as profilesService from '../../services/profilesService'
import { getOpenEntry } from '../../services/timeEntriesService'
import { Card } from '../../components/Card'
import { Button } from '../../components/Button'
import { TextInput } from '../../components/Field'
import { Avatar } from '../../components/Avatar'
import { EmptyState, Spinner } from '../../components/Feedback'
import type { Profile } from '../../types'

const ORATORY_LABEL: Record<string, string> = { jerago: 'Jerago', besnate: 'Besnate' }
type Filtro = 'Tutti' | 'Presenti' | 'Assenti'

export function AdminAnimatoriPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()
  const [rows, setRows] = useState<Profile[] | null>(null)
  const [query, setQuery] = useState('')
  const [filtro, setFiltro] = useState<Filtro>('Tutti')

  const load = () => {
    if (!user) return
    profilesService.listAnimatori(user).then(setRows)
  }
  useEffect(load, [user])

  const pending = rows?.filter((r) => r.status === 'pending') ?? []
  const active = useMemo(() => {
    const list = (rows ?? []).filter((r) => r.status === 'active')
    return list.filter((r) => {
      const matchesQuery = `${r.firstName} ${r.lastName}`.toLowerCase().includes(query.toLowerCase())
      if (!matchesQuery) return false
      if (filtro === 'Tutti') return true
      const present = !!getOpenEntry(r.id)
      return filtro === 'Presenti' ? present : !present
    })
  }, [rows, query, filtro])

  async function handleApprove(id: string) {
    if (!user) return
    try {
      await profilesService.approveProfile(user, id)
      toast.success('Animatore approvato')
      load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Errore')
    }
  }

  async function handleReject(id: string) {
    if (!user) return
    try {
      await profilesService.rejectProfile(user, id)
      toast.info('Richiesta rifiutata')
      load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Errore')
    }
  }

  if (!rows) return <Spinner />

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4 px-5 py-5 lg:px-8 lg:py-7">
      <div className="text-[20px] font-extrabold text-ink-950">Animatori</div>

      {pending.length > 0 && (
        <Card className="animate-up flex flex-col gap-3 !border-warn-200 bg-warn-50">
          <div className="text-[13.5px] font-extrabold text-warn-700">{pending.length} richiest{pending.length === 1 ? 'a' : 'e'} di iscrizione</div>
          {pending.map((p) => (
            <div key={p.id} className="flex flex-col gap-2.5 border-t border-warn-200/70 pt-3 first:border-0 first:pt-0">
              <div className="flex items-center gap-2.5">
                <Avatar firstName={p.firstName} lastName={p.lastName} avatarUrl={p.avatarUrl} size={34} />
                <div className="flex-1">
                  <div className="text-sm font-bold text-ink-950">{p.firstName} {p.lastName}</div>
                  <div className="text-xs text-warn-700/80">{ORATORY_LABEL[p.oratoryId ?? ''] ?? '—'} · {p.birthYear}</div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button className="!flex-1 !py-2.5 !text-[13px]" variant="success" onClick={() => handleApprove(p.id)}>Approva</Button>
                <Button className="!flex-1 !py-2.5 !text-[13px] hover:!border-bad-500 hover:!text-bad-500" variant="secondary" onClick={() => handleReject(p.id)}>Rifiuta</Button>
              </div>
            </div>
          ))}
        </Card>
      )}

      <div className="relative">
        <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <TextInput className="pl-10" placeholder="Cerca animatore…" value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>

      <div className="flex gap-2">
        {(['Tutti', 'Presenti', 'Assenti'] as Filtro[]).map((f) => (
          <button
            key={f}
            onClick={() => setFiltro(f)}
            className={`flex-1 rounded-full px-3 py-2 text-[12.5px] font-bold transition-colors ${filtro === f ? 'bg-brand-600 text-white' : 'border border-slate-200 bg-white text-slate-600 hover:border-brand-300'}`}
          >
            {f}
          </button>
        ))}
      </div>

      {active.length === 0 ? (
        <EmptyState title="Nessun animatore trovato" />
      ) : (
        <div className="flex flex-col gap-2.5">
          {active.map((a) => {
            const present = !!getOpenEntry(a.id)
            return (
              <button
                key={a.id}
                onClick={() => navigate(`/admin/animatori/${a.id}`)}
                className="animate-up flex items-center gap-3 rounded-[16px] border border-slate-200/80 bg-white p-3.5 text-left transition-all hover:-translate-y-0.5 hover:shadow-[0_10px_22px_rgba(15,23,42,0.08)]"
              >
                <span className={`h-2 w-2 shrink-0 rounded-full ${present ? 'bg-good-500' : 'bg-bad-500'}`} />
                <Avatar firstName={a.firstName} lastName={a.lastName} avatarUrl={a.avatarUrl} size={34} />
                <span className="flex-1">
                  <span className="block text-sm font-bold text-ink-950">{a.firstName} {a.lastName}</span>
                  <span className="block text-xs text-slate-500">{present ? 'Presente' : 'Non presente'}</span>
                </span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
