import { useEffect, useRef, useState, type ChangeEvent, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, Camera, ChevronRight, Clock, FileText, LogOut, UserRound } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { useToast } from '../../hooks/useToast'
import * as profilesService from '../../services/profilesService'
import * as pushService from '../../services/pushService'
import { Avatar } from '../../components/Avatar'
import { Card } from '../../components/Card'

const ORATORY_LABEL: Record<string, string> = { jerago: 'Jerago', besnate: 'Besnate' }

export function ProfiloPage() {
  const { user, logout, refresh } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()
  const fileRef = useRef<HTMLInputElement>(null)
  const [showInfo, setShowInfo] = useState(false)
  const [pushEnabled, setPushEnabled] = useState(false)
  const [pushBusy, setPushBusy] = useState(false)
  const pushSupported = pushService.isPushSupported()

  useEffect(() => {
    if (!pushSupported) return
    pushService.getPushSubscription().then((sub) => setPushEnabled(!!sub))
  }, [pushSupported])

  if (!user) return null

  async function togglePush() {
    setPushBusy(true)
    try {
      if (pushEnabled) {
        await pushService.unsubscribeFromPush()
        setPushEnabled(false)
        toast.info('Notifiche disattivate')
      } else {
        await pushService.subscribeToPush(user!.id)
        setPushEnabled(true)
        toast.success('Notifiche attivate')
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Errore con le notifiche')
    } finally {
      setPushBusy(false)
    }
  }

  async function onPickAvatar(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !user) return
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      toast.error('Carica un\'immagine PNG, JPEG o WebP.')
      return
    }
    const reader = new FileReader()
    reader.onload = async () => {
      await profilesService.updateAvatar(user, reader.result as string)
      await refresh()
      toast.success('Foto profilo aggiornata')
    }
    reader.readAsDataURL(file)
  }

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6 px-5 pb-6 pt-5 lg:max-w-2xl lg:px-8 lg:pt-8">
      <div className="flex flex-col items-center gap-2">
        <div className="relative">
          <div className="rounded-full bg-gradient-to-br from-brand-600 to-accent-cyan p-[3px] shadow-[0_14px_30px_rgba(79,70,229,0.28)]">
            <Avatar firstName={user.firstName} lastName={user.lastName} avatarUrl={user.avatarUrl} size={96} />
          </div>
          <button
            onClick={() => fileRef.current?.click()}
            className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-brand-600 text-white shadow"
            aria-label="Cambia foto profilo"
          >
            <Camera size={14} />
          </button>
          <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={onPickAvatar} />
        </div>
        <div className="mt-1 text-xl font-extrabold text-ink-950">{user.firstName} {user.lastName}</div>
        <div className="text-[13px] text-slate-500">{ORATORY_LABEL[user.oratoryId ?? ''] ?? '—'} · {user.birthYear}</div>
        <div className="mt-0.5 rounded-full bg-good-50 px-3.5 py-1.5 text-xs font-bold text-good-700">Animatore</div>
      </div>

      <Card className="!p-0 overflow-hidden">
        <MenuRow icon={<UserRound size={15} />} label="Le mie info" onClick={() => setShowInfo((s) => !s)} />
        <MenuRow icon={<Clock size={15} />} label="Le mie presenze" onClick={() => navigate('/presenze')} />
        <MenuRow icon={<FileText size={15} />} label="I miei moduli" onClick={() => navigate('/moduli')} last />
      </Card>

      {pushSupported && (
        <Card className="flex items-center gap-3">
          <span className="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500 to-accent-cyan text-white"><Bell size={14} /></span>
          <span className="flex-1 text-sm font-semibold text-ink-950">Notifiche push</span>
          <button
            disabled={pushBusy}
            onClick={togglePush}
            className={`flex h-[26px] w-[46px] items-center rounded-full p-[3px] transition-colors disabled:opacity-50 ${pushEnabled ? 'justify-end bg-good-500' : 'justify-start bg-slate-300'}`}
          >
            <span className="h-5 w-5 rounded-full bg-white" />
          </button>
        </Card>
      )}

      {showInfo && (
        <Card className="animate-up flex flex-col gap-2.5 text-[13px]">
          <InfoRow label="Email" value={user.email} />
          <InfoRow label="Nome" value={user.firstName} />
          <InfoRow label="Cognome" value={user.lastName} />
          <InfoRow label="Anno di nascita" value={String(user.birthYear)} />
          <InfoRow label="Oratorio" value={ORATORY_LABEL[user.oratoryId ?? ''] ?? '—'} />
        </Card>
      )}

      <button
        onClick={logout}
        className="flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-[14px] font-bold text-bad-600 transition-colors hover:bg-bad-50"
      >
        <LogOut size={16} /> Esci
      </button>
    </div>
  )
}

function MenuRow({ icon, label, onClick, last }: { icon: ReactNode; label: string; onClick: () => void; last?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-3 px-4 py-4 text-left transition-colors hover:bg-slate-50 ${last ? '' : 'border-b border-slate-100'}`}
    >
      <span className="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500 to-accent-cyan text-white">{icon}</span>
      <span className="flex-1 text-sm font-semibold text-ink-950">{label}</span>
      <ChevronRight size={16} className="text-slate-300" />
    </button>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 last:border-0 last:pb-0">
      <span className="font-semibold text-slate-400">{label}</span>
      <span className="font-bold text-ink-950">{value}</span>
    </div>
  )
}
