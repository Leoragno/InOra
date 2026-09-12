import { db, tick } from './db'
import { assertCanManageProfile, scopedOratories } from '../utils/authz'
import { writeAudit } from './auditService'
import type { OratoryId, Profile } from '../types'

export async function listAnimatori(actor: Profile): Promise<Profile[]> {
  const allowed = new Set(scopedOratories(actor))
  const rows = db.get().profiles.filter((p) => p.role === 'animatore' && p.oratoryId && allowed.has(p.oratoryId))
  return tick(rows.sort((a, b) => a.firstName.localeCompare(b.firstName)))
}

export async function listAnimatoriForOratory(actor: Profile, oratoryId: OratoryId): Promise<Profile[]> {
  if (!scopedOratories(actor).includes(oratoryId)) return tick([])
  const rows = db.get().profiles.filter((p) => p.role === 'animatore' && p.oratoryId === oratoryId)
  return tick(rows.sort((a, b) => a.firstName.localeCompare(b.firstName)))
}

export async function listPendingRequests(actor: Profile): Promise<Profile[]> {
  const rows = await listAnimatori(actor)
  return rows.filter((p) => p.status === 'pending')
}

export async function getProfile(id: string): Promise<Profile | null> {
  return tick(db.get().profiles.find((p) => p.id === id) ?? null)
}

async function setStatus(actor: Profile, targetId: string, status: Profile['status'], action: 'profile.approve' | 'profile.reject' | 'profile.disable'): Promise<Profile> {
  const database = db.get()
  const target = database.profiles.find((p) => p.id === targetId)
  if (!target) throw new Error('Animatore non trovato.')
  assertCanManageProfile(actor, target)
  target.status = status
  target.updatedAt = new Date().toISOString()
  db.save()
  writeAudit(actor, action, 'profile', targetId, { status })
  return tick({ ...target })
}

export const approveProfile = (actor: Profile, targetId: string) => setStatus(actor, targetId, 'active', 'profile.approve')
export const rejectProfile = (actor: Profile, targetId: string) => setStatus(actor, targetId, 'rejected', 'profile.reject')
export const disableProfile = (actor: Profile, targetId: string) => setStatus(actor, targetId, 'disabled', 'profile.disable')
export const reactivateProfile = (actor: Profile, targetId: string) => setStatus(actor, targetId, 'active', 'profile.approve')

export async function updateAvatar(actor: Profile, avatarUrl: string | null): Promise<Profile> {
  const database = db.get()
  const target = database.profiles.find((p) => p.id === actor.id)
  if (!target) throw new Error('Profilo non trovato.')
  target.avatarUrl = avatarUrl
  target.updatedAt = new Date().toISOString()
  db.save()
  return tick({ ...target })
}

export interface ProfileEdit {
  firstName: string
  lastName: string
  birthYear: number
  oratoryId: OratoryId
}

export async function editProfile(actor: Profile, targetId: string, edit: ProfileEdit): Promise<Profile> {
  const database = db.get()
  const target = database.profiles.find((p) => p.id === targetId)
  if (!target) throw new Error('Animatore non trovato.')
  assertCanManageProfile(actor, target)
  Object.assign(target, edit, { updatedAt: new Date().toISOString() })
  db.save()
  return tick({ ...target })
}
