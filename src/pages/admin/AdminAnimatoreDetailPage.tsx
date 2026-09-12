import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { useToast } from '../../hooks/useToast'
import * as profilesService from '../../services/profilesService'
import * as timeEntriesService from '../../services/timeEntriesService'
import { Card } from '../../components/Card'
import { Button } from '../../components/Button'
import { Field, SelectInput, TextInput } from '../../components/Field'
import { Avatar } from '../../components/Avatar'
import { Spinner } from '../../components/Feedback'
import { formatDurationMinutes, formatFullDate } from '../../lib/format'
import { groupSessionsByDay, dayTotalMinutes, isDayOpen } from '../../lib/timeSessions'
import type { OratoryId, Profile, TimeEntry } from '../../types'

const ORATORY_LABEL: Record<string, string> = { jerago: 'Jerago', besnate: 'Besnate' }

function todayInputValue(): string {
  return new Date().toISOString().slice(0, 10)
}

function timeInputValue(iso: string | null): string {
  if (!iso) return ''
  return new Date(iso).toTimeString().slice(0, 5)
}

function combine(dateStr: string, timeStr: string): string {
  return new Date(`${dateStr}T${timeStr}:00`).toISOString()
}

export function AdminAnimatoreDetailPage() {
  const { userId } = useParams<{ userId: string }>()
  const { user: actor } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()

  const [profile, setProfile] = useState<Profile | null>(null)
  const [editing, setEditing] = useState(false)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [birthYear, setBirthYear] = useState(2007)
  const [oratoryId, setOratoryId] = useState<OratoryId>('jerago')

  const [day, setDay] = useState(todayInputValue())
  const [dayEntry, setDayEntry] = useState<TimeEntry | null>(null)
  const [entryTime, setEntryTime] = useState('')
  const [exitTime, setExitTime] = useState('')
  const [recent, setRecent] = useState<{ label: string; minutes: number | null }[]>([])

  function loadProfile() {
    if (!userId) return
    profilesService.getProfile(userId).then((p) => {
      setProfile(p)
      if (p) {
        setFirstName(p.firstName); setLastName(p.lastName); setBirthYear(p.birthYear); setOratoryId(p.oratoryId ?? 'jerago')
      }
    })
  }
  useEffect(loadProfile, [userId])

  useEffect(() => {
    if (!userId) return
    const dStart = new Date(`${day}T00:00:00`)
    const dEnd = new Date(`${day}T23:59:59`)
    timeEntriesService.listEntriesForUser(userId, dStart, dEnd).then((rows) => {
      const entry = rows.find((r) => r.type === 'entry') ?? null
      const exit = rows.find((r) => r.type === 'exit') ?? null
      setDayEntry(entry)
      setEntryTime(timeInputValue(entry?.timestamp ?? null))
      setExitTime(timeInputValue(exit?.timestamp ?? null))
    })
  }, [userId, day])

  useEffect(() => {
    if (!userId) return
    const start = new Date(); start.setDate(start.getDate() - 6); start.setHours(0, 0, 0, 0)
    timeEntriesService.listEntriesForUser(userId, start, new Date()).then((rows) => {
      const list = groupSessionsByDay(rows).map((d) => ({
        label: formatFullDate(d.date.toISOString()),
        minutes: isDayOpen(d) && dayTotalMinutes(d) === 0 ? null : dayTotalMinutes(d),
      }))
      setRecent(list)
    })
  }, [userId])

  if (!actor || !profile) return <Spinner />

  async function saveEdit() {
    if (!actor || !profile) return
    try {
      const updated = await profilesService.editProfile(actor, profile.id, { firstName, lastName, birthYear, oratoryId })
      setProfile(updated)
      setEditing(false)
      toast.success('Profilo aggiornato')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Errore')
    }
  }

  async function saveDay() {
    if (!actor || !profile) return
    try {
      await timeEntriesService.manualCorrectDay(actor, profile.id, profile.oratoryId ?? oratoryId, day, {
        entryTimestamp: entryTime ? combine(day, entryTime) : undefined,
        exitTimestamp: exitTime ? combine(day, exitTime) : undefined,
      })
      toast.success('Timbratura corretta')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Errore')
    }
  }

  async function toggleStatus() {
    if (!actor || !profile) return
    try {
      const updated = profile.status === 'disabled'
        ? await profilesService.reactivateProfile(actor, profile.id)
        : await profilesService.disableProfile(actor, profile.id)
      setProfile(updated)
      toast.success(updated.status === 'disabled' ? 'Account disattivato' : 'Account riattivato')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Errore')
    }
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-5 px-5 py-5 lg:px-8 lg:py-7">
      <button onClick={() => navigate('/admin/animatori')} className="flex items-center gap-1.5 self-start text-sm font-semibold text-slate-500">
        <ChevronLeft size={18} /> Animatori
      </button>

      <div className="flex items-center gap-3.5">
        <Avatar firstName={profile.firstName} lastName={profile.lastName} avatarUrl={profile.avatarUrl} size={56} />
        <div>
          <div className="text-lg font-extrabold text-ink-950">{profile.firstName} {profile.lastName}</div>
          <div className="text-[13px] text-slate-500">{ORATORY_LABEL[profile.oratoryId ?? ''] ?? '—'} · {profile.birthYear}</div>
        </div>
        <span className={`ml-auto rounded-full px-3 py-1.5 text-xs font-bold ${profile.status === 'active' ? 'bg-good-50 text-good-700' : profile.status === 'disabled' ? 'bg-bad-50 text-bad-600' : 'bg-slate-100 text-slate-500'}`}>
          {profile.status === 'active' ? 'Attivo' : profile.status === 'disabled' ? 'Disattivato' : profile.status}
        </span>
      </div>

      <Card className="flex flex-col gap-3.5">
        <div className="flex items-center justify-between">
          <div className="text-sm font-extrabold text-ink-950">Informazioni</div>
          {!editing && <button onClick={() => setEditing(true)} className="text-[12.5px] font-bold text-brand-600">Modifica</button>}
        </div>
        {editing ? (
          <div className="flex flex-col gap-3">
            <Field label="Nome"><TextInput value={firstName} onChange={(e) => setFirstName(e.target.value)} /></Field>
            <Field label="Cognome"><TextInput value={lastName} onChange={(e) => setLastName(e.target.value)} /></Field>
            <Field label="Anno di nascita"><TextInput type="number" value={birthYear} onChange={(e) => setBirthYear(Number(e.target.value))} /></Field>
            <Field label="Oratorio">
              <SelectInput value={oratoryId} onChange={(e) => setOratoryId(e.target.value as OratoryId)}>
                <option value="jerago">Jerago</option>
                <option value="besnate">Besnate</option>
              </SelectInput>
            </Field>
            <div className="flex gap-2">
              <Button onClick={saveEdit} className="!flex-1">Salva</Button>
              <Button variant="secondary" className="!flex-1" onClick={() => setEditing(false)}>Annulla</Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-2 text-[13px]">
            <div className="flex justify-between"><span className="text-slate-400">Email</span><span className="font-bold text-ink-950">{profile.email}</span></div>
          </div>
        )}
      </Card>

      <Card className="flex flex-col gap-3.5">
        <div className="text-sm font-extrabold text-ink-950">Correggi timbratura</div>
        <Field label="Giorno"><TextInput type="date" value={day} onChange={(e) => setDay(e.target.value)} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Entrata"><TextInput type="time" value={entryTime} onChange={(e) => setEntryTime(e.target.value)} /></Field>
          <Field label="Uscita"><TextInput type="time" value={exitTime} onChange={(e) => setExitTime(e.target.value)} /></Field>
        </div>
        {(dayEntry?.distanceFromOratory != null || dayEntry?.gpsAccuracy != null) && (
          <div className="text-[11.5px] text-slate-400">
            Rilevata a {dayEntry.distanceFromOratory != null ? `${Math.round(dayEntry.distanceFromOratory)}m` : '—'} dall'oratorio
            {dayEntry.gpsAccuracy != null && `, precisione ±${Math.round(dayEntry.gpsAccuracy)}m`}
            {dayEntry.gpsAccuracy != null && dayEntry.gpsAccuracy > 120 && <span className="ml-1 font-bold text-warn-700">(bassa precisione)</span>}
          </div>
        )}
        <Button onClick={saveDay} fullWidth>Salva correzione</Button>
      </Card>

      <Card className="flex flex-col gap-2.5">
        <div className="text-sm font-extrabold text-ink-950">Ultimi 7 giorni</div>
        {recent.length === 0 && <div className="text-[12.5px] text-slate-400">Nessuna presenza registrata.</div>}
        {recent.map((r) => (
          <div key={r.label} className="flex justify-between border-b border-slate-100 py-2 text-[13px] last:border-0">
            <span className="text-slate-500">{r.label}</span>
            <span className="font-bold text-ink-950">{r.minutes != null ? formatDurationMinutes(r.minutes) : '—'}</span>
          </div>
        ))}
      </Card>

      <Button variant={profile.status === 'disabled' ? 'success' : 'danger'} onClick={toggleStatus} fullWidth>
        {profile.status === 'disabled' ? 'Riattiva account' : 'Disattiva account'}
      </Button>
    </div>
  )
}
