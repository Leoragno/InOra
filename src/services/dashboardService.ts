import { db, tick } from './db'
import { assertCanManageOratory, scopedOratories } from '../utils/authz'
import { listAnimatoriForOratory } from './profilesService'
import { listEntriesForUser, getOpenEntry } from './timeEntriesService'
import { listOratories } from './oratoriesService'
import { listRecentForUsers } from './auditService'
import { groupSessionsByDay, dayTotalMinutes } from '../lib/timeSessions'
import type { AuditLog, OratoryId, Profile, TimeEntry } from '../types'

export interface AnimatorePresence {
  profile: Profile
  present: boolean
  entryTime: string | null
}

export interface OratoryDashboard {
  presentToday: number
  absentToday: number
  totalAnimatori: number
  monthHours: number
  activeFormsCount: number
  presences: AnimatorePresence[]
  recentActivity: { id: string; text: string; time: string }[]
}

function describeAudit(log: AuditLog, profiles: Profile[]): string | null {
  const who = profiles.find((p) => p.id === log.userId)
  const name = who ? `${who.firstName} ${who.lastName}` : 'Qualcuno'
  switch (log.action) {
    case 'time_entry.create': {
      const kind = (log.metadata as { type?: string }).type
      return `Timbratura ${name} · ${kind === 'exit' ? 'Uscita' : 'Entrata'}`
    }
    case 'form.response':
      return `${name} ha inviato una risposta al modulo`
    case 'form.create':
      return `Nuovo modulo pubblicato: ${(log.metadata as { title?: string }).title ?? ''}`
    case 'profile.approve':
      return `${name} è stato approvato`
    case 'profile.reject':
      return `${name} è stato rifiutato`
    case 'profile.disable':
      return `${name} è stato disattivato`
    case 'oratory.gps_update':
      return `Impostazioni GPS aggiornate`
    default:
      return null
  }
}

export async function getOratoryDashboard(actor: Profile, oratoryId: OratoryId): Promise<OratoryDashboard> {
  assertCanManageOratory(actor, oratoryId)
  const database = db.get()
  const animatori = await listAnimatoriForOratory(actor, oratoryId)
  const activeAnimatori = animatori.filter((a) => a.status === 'active')

  const opens: (TimeEntry | null)[] = await Promise.all(activeAnimatori.map((profile) => getOpenEntry(profile.id)))
  const presences: AnimatorePresence[] = activeAnimatori.map((profile, i) => {
    const open = opens[i]
    return { profile, present: !!open, entryTime: open?.timestamp ?? null }
  })
  presences.sort((a, b) => a.profile.firstName.localeCompare(b.profile.firstName))

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)
  let monthMinutes = 0
  for (const a of activeAnimatori) {
    const entries = await listEntriesForUser(a.id, monthStart, monthEnd)
    for (const day of groupSessionsByDay(entries)) monthMinutes += dayTotalMinutes(day)
  }

  const activeFormsCount = database.forms.filter(
    (f) => f.status === 'open' && (f.targetType === 'all' || (f.targetType === 'oratory' && f.targetOratories.includes(oratoryId))),
  ).length

  const relevantUserIds = [...new Set([...animatori.map((a) => a.id), actor.id])]
  const recentLogs = await listRecentForUsers(relevantUserIds, 6)
  const namedProfiles = [...animatori, actor]
  const recentActivity = recentLogs
    .map((l) => ({ id: l.id, text: describeAudit(l, namedProfiles), time: l.createdAt }))
    .filter((x): x is { id: string; text: string; time: string } => !!x.text)

  return tick({
    presentToday: presences.filter((p) => p.present).length,
    absentToday: presences.filter((p) => !p.present).length,
    totalAnimatori: activeAnimatori.length,
    monthHours: Math.round(monthMinutes / 60),
    activeFormsCount,
    presences,
    recentActivity,
  })
}

export interface GeneralOverview {
  presentNow: number
  totalAnimatori: number
  perOratory: { oratoryId: OratoryId; name: string; present: number; total: number }[]
}

export async function getGeneralOverview(actor: Profile): Promise<GeneralOverview> {
  const oratories = scopedOratories(actor)
  const allOratories = await listOratories()
  const perOratory = []
  let presentNow = 0
  let totalAnimatori = 0
  for (const oratoryId of oratories) {
    const oratory = allOratories.find((o) => o.id === oratoryId)!
    const animatori = (await listAnimatoriForOratory(actor, oratoryId)).filter((a) => a.status === 'active')
    const opens = await Promise.all(animatori.map((a) => getOpenEntry(a.id)))
    const present = opens.filter(Boolean).length
    presentNow += present
    totalAnimatori += animatori.length
    perOratory.push({ oratoryId, name: oratory.name, present, total: animatori.length })
  }
  return tick({ presentNow, totalAnimatori, perOratory })
}
