import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { Clock, FileText, MapPin, QrCode } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { useGeolocation } from '../../hooks/useGeolocation'
import { useToast } from '../../hooks/useToast'
import { Avatar } from '../../components/Avatar'
import { Card } from '../../components/Card'
import { Button } from '../../components/Button'
import * as timeEntriesService from '../../services/timeEntriesService'
import * as oratoriesService from '../../services/oratoriesService'
import { TimeEntryStateError } from '../../services/timeEntriesService'
import { consumePendingQa, type QaAction } from '../../lib/pendingQa'
import { formatTime, minutesBetween, formatDurationMinutes } from '../../lib/format'
import type { Oratory, TimeEntry } from '../../types'

export function HomePage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()
  const { locate, progress } = useGeolocation()

  const [oratory, setOratory] = useState<Oratory | null>(null)
  const [open, setOpen] = useState<TimeEntry | null>(null)
  const [today, setToday] = useState<{ entry: TimeEntry | null; exit: TimeEntry | null }>({ entry: null, exit: null })
  const [distancePreview, setDistancePreview] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)
  const [qaPending, setQaPending] = useState<QaAction | null>(() => consumePendingQa())

  const refresh = useCallback(() => {
    if (!user) return
    setOpen(timeEntriesService.getOpenEntry(user.id))
    setToday(timeEntriesService.getTodayPair(user.id))
  }, [user])

  useEffect(() => { refresh() }, [refresh])

  useEffect(() => {
    if (!user?.oratoryId) return
    oratoriesService.getOratory(user.oratoryId).then((o) => {
      setOratory(o)
      if (o?.gpsEnabled) {
        locate().then((geo) => {
          if (!geo) return
          const preview = timeEntriesService.previewDistance(user.oratoryId!, geo)
          if (preview?.distance != null) setDistancePreview(Math.round(preview.distance))
        })
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.oratoryId])

  if (!user || !user.oratoryId) return null

  async function handleClock(action: 'in' | 'out') {
    if (busy || !user?.oratoryId) return
    setBusy(true)
    try {
      const metodo = qaPending ? 'qr' : 'gps'
      const result = action === 'in'
        ? await timeEntriesService.clockIn(user, user.oratoryId, oratory?.gpsEnabled ? await locate() : null, metodo)
        : await timeEntriesService.clockOut(user, user.oratoryId, metodo === 'qr' ? 'qr' : 'manuale')
      setQaPending(null)
      if (result.warning) toast.info(result.warning)
      else toast.success(action === 'in' ? 'Timbratura di entrata completata' : 'Timbratura di uscita completata')
      refresh()
    } catch (err) {
      if (err instanceof TimeEntryStateError) toast.error(err.message)
      else toast.error(err instanceof Error ? err.message : 'Impossibile completare la timbratura')
      refresh()
    } finally {
      setBusy(false)
    }
  }

  const totalMinutes = today.entry
    ? minutesBetween(today.entry.timestamp, today.exit?.timestamp ?? new Date().toISOString())
    : null

  const showQaBanner = qaPending === 'in' ? !open : qaPending === 'out' ? !!open : false

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-5 px-5 pb-6 pt-5 lg:max-w-2xl lg:px-8 lg:pt-8">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-[22px] font-extrabold text-ink-950">Ciao {user.firstName} 👋</div>
          <div className="mt-0.5 text-[13px] text-slate-500">{oratory?.name ?? '—'}</div>
        </div>
        <button onClick={() => navigate('/profilo')} className="transition-transform hover:scale-105">
          <Avatar firstName={user.firstName} lastName={user.lastName} avatarUrl={user.avatarUrl} />
        </button>
      </div>

      {showQaBanner && (
        <Card className="animate-up flex items-center gap-3 !border-brand-200 bg-brand-50">
          <QrCode size={22} className="shrink-0 text-brand-600" />
          <div className="flex-1 text-[13px] font-semibold text-brand-700">
            {qaPending === 'in' ? 'QR Ingresso rilevato' : 'QR Uscita rilevato'}
          </div>
          <Button
            className="!px-3.5 !py-2 !text-[12.5px]"
            loading={busy}
            onClick={() => handleClock(qaPending === 'in' ? 'in' : 'out')}
          >
            Conferma
          </Button>
        </Card>
      )}

      {!open ? (
        <Card className="animate-up flex flex-col gap-3.5">
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inset-0 animate-ring rounded-full bg-slate-400" />
              <span className="relative h-2.5 w-2.5 rounded-full bg-slate-400" />
            </span>
            <span className="text-[12.5px] font-extrabold tracking-wider text-slate-600">NON TIMBRATO</span>
          </div>
          <div className="flex items-center gap-1.5 text-[13px] text-slate-500">
            <MapPin size={14} />
            {oratory?.gpsEnabled
              ? distancePreview != null
                ? `${distancePreview <= oratory.gpsRadius ? 'Sei nell\'oratorio' : 'Sei fuori area'} · ${distancePreview} m di distanza`
                : progress
                  ? `Raffinamento GPS… ±${Math.round(progress.accuracy)}m (${progress.readings} letture)`
                  : 'Verifica della posizione…'
              : 'GPS non richiesto per questo oratorio'}
          </div>
          <Button onClick={() => handleClock('in')} loading={busy} fullWidth>Entrata</Button>
        </Card>
      ) : (
        <Card className="animate-pop flex flex-col gap-3.5 border-[1.5px] border-good-300 bg-gradient-to-br from-good-50 to-[#d7f7ea] shadow-[0_12px_30px_rgba(16,185,129,0.16)]">
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-[22px] w-[22px] items-center justify-center">
              <span className="absolute inset-0 animate-ring rounded-full bg-good-500" />
              <span className="relative flex h-[22px] w-[22px] items-center justify-center rounded-full bg-good-500 text-[11px] text-white">✓</span>
            </span>
            <span className="text-[12.5px] font-extrabold tracking-wider text-good-700">SEI PRESENTE</span>
          </div>
          <div className="text-[26px] font-extrabold tracking-tight text-good-900">Entrata {formatTime(open.timestamp)}</div>
          <div className="flex items-center gap-1.5 text-[12.5px] font-semibold text-good-700">
            <MapPin size={14} />
            {oratory?.name}
            {distancePreview != null && ` · ${distancePreview} m dall'oratorio`}
          </div>
          <Button variant="danger" onClick={() => handleClock('out')} loading={busy} fullWidth>Uscita</Button>
        </Card>
      )}

      <div className="flex items-baseline justify-between">
        <div className="text-[15px] font-extrabold text-ink-950">Oggi</div>
        <div className="text-xs font-semibold text-slate-400">{new Date().toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
      </div>
      <Card className="!p-0 overflow-hidden">
        <Row label="Entrata" value={today.entry ? formatTime(today.entry.timestamp) : '—'} />
        <Row label="Uscita" value={today.exit ? formatTime(today.exit.timestamp) : '—'} />
        <Row label="Totale" value={totalMinutes != null ? (today.exit ? formatDurationMinutes(totalMinutes) : 'in corso') : '—'} last />
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <QuickLink to="/presenze" icon={<Clock size={16} className="text-white" />} gradient="from-brand-500 to-accent-cyan" label="Le mie presenze" onNavigate={navigate} />
        <QuickLink to="/moduli" icon={<FileText size={16} className="text-white" />} gradient="from-warn-500 to-[#fb7185]" label="Moduli" onNavigate={navigate} />
      </div>
    </div>
  )
}

function Row({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <div className={`flex items-center justify-between px-4 py-3.5 text-[13.5px] text-slate-600 ${last ? '' : 'border-b border-slate-100'}`}>
      <span>{label}</span>
      <span className="font-bold text-ink-950">{value}</span>
    </div>
  )
}

function QuickLink({ to, icon, gradient, label, onNavigate }: { to: string; icon: ReactNode; gradient: string; label: string; onNavigate: (t: string) => void }) {
  return (
    <button
      onClick={() => onNavigate(to)}
      className="animate-up rounded-[18px] border border-slate-200/80 bg-white p-4 text-left shadow-[0_6px_18px_rgba(15,23,42,0.05)] transition-all hover:-translate-y-1 hover:border-brand-300 hover:shadow-[0_14px_30px_rgba(79,70,229,0.14)]"
    >
      <span className={`flex h-[30px] w-[30px] items-center justify-center rounded-[10px] bg-gradient-to-br ${gradient}`}>{icon}</span>
      <span className="mt-2.5 block text-[13.5px] font-bold text-ink-950">{label}</span>
    </button>
  )
}
