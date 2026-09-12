import { useEffect, useState } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { useToast } from '../../hooks/useToast'
import * as oratoriesService from '../../services/oratoriesService'
import { scopedOratories } from '../../utils/authz'
import { Card } from '../../components/Card'
import { Button } from '../../components/Button'
import { Spinner } from '../../components/Feedback'
import type { Oratory } from '../../types'

export function AdminGpsPage() {
  const { user } = useAuth()
  const toast = useToast()
  const [oratories, setOratories] = useState<Oratory[] | null>(null)
  const [saving, setSaving] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    const allowed = new Set(scopedOratories(user))
    oratoriesService.listOratories().then((rows) => setOratories(rows.filter((o) => allowed.has(o.id))))
  }, [user])

  if (!oratories) return <Spinner />

  function updateLocal(id: string, patch: Partial<Oratory>) {
    setOratories((rows) => rows!.map((o) => (o.id === id ? { ...o, ...patch } : o)))
  }

  async function save(o: Oratory) {
    if (!user) return
    setSaving(o.id)
    try {
      await oratoriesService.updateGpsSettings(user, o.id, { gpsEnabled: o.gpsEnabled, gpsRadius: o.gpsRadius })
      toast.success(`Impostazioni ${o.name} salvate`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Errore')
    } finally {
      setSaving(null)
    }
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4 px-5 py-5 lg:px-8 lg:py-7">
      <div className="text-[20px] font-extrabold text-ink-950">Impostazioni GPS</div>
      {oratories.map((o) => (
        <Card key={o.id} className="flex flex-col gap-4">
          <div className="flex items-center gap-2.5">
            <span className={`h-2.5 w-2.5 rounded-full ${o.id === 'jerago' ? 'bg-bad-600' : 'bg-good-700'}`} />
            <div className="text-base font-extrabold text-ink-950">{o.name}</div>
          </div>
          <div className="flex items-center justify-between gap-3">
            <div className="text-[13px] font-semibold text-slate-600">GPS obbligatorio</div>
            <button
              onClick={() => updateLocal(o.id, { gpsEnabled: !o.gpsEnabled })}
              className={`flex h-[26px] w-[46px] items-center rounded-full p-[3px] transition-colors ${o.gpsEnabled ? 'justify-end bg-good-500' : 'justify-start bg-slate-300'}`}
            >
              <span className="h-5 w-5 rounded-full bg-white" />
            </button>
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-400">Posizione oratorio</div>
            <div className="mt-0.5 text-[13.5px] font-bold text-ink-950">{o.latitude.toFixed(4)}, {o.longitude.toFixed(4)}</div>
          </div>
          <div>
            <div className="flex justify-between text-xs font-semibold text-slate-400">
              <span>Raggio consentito</span>
              <span className="font-extrabold text-brand-600">{o.gpsRadius} m</span>
            </div>
            <input
              type="range"
              min={20}
              max={200}
              step={5}
              value={o.gpsRadius}
              onChange={(e) => updateLocal(o.id, { gpsRadius: Number(e.target.value) })}
              className="mt-2 w-full accent-brand-600"
            />
          </div>
          <Button onClick={() => save(o)} loading={saving === o.id}>Salva impostazioni</Button>
        </Card>
      ))}
    </div>
  )
}
