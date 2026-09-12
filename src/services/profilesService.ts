// Fase 1 della migrazione a Supabase: profiles/oratories/auth sono già sul
// database reale. auditService/timeEntriesService/formsService sono ancora
// sul demo-store locale (fase 2) — per questo qui non si scrive più
// nell'audit log locale, sarebbe scollegato dagli attori reali.
import { supabase } from '../lib/supabaseClient'
import { assertCanManageProfile, scopedOratories } from '../utils/authz'
import type { OratoryId, Profile } from '../types'

interface ProfileRow {
  id: string
  first_name: string
  last_name: string
  birth_year: number
  email: string
  role: Profile['role']
  oratory_id: OratoryId | null
  status: Profile['status']
  avatar_url: string | null
  created_at: string
  updated_at: string
}

export function mapProfile(row: ProfileRow): Profile {
  return {
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    birthYear: row.birth_year,
    email: row.email,
    role: row.role,
    oratoryId: row.oratory_id,
    status: row.status,
    avatarUrl: row.avatar_url,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export async function listAnimatori(actor: Profile): Promise<Profile[]> {
  const allowed = scopedOratories(actor)
  if (!allowed.length) return []
  const { data, error } = await supabase.from('profiles').select('*').eq('role', 'animatore').in('oratory_id', allowed).order('first_name')
  if (error) throw error
  return (data as ProfileRow[]).map(mapProfile)
}

export async function listAnimatoriForOratory(actor: Profile, oratoryId: OratoryId): Promise<Profile[]> {
  if (!scopedOratories(actor).includes(oratoryId)) return []
  const { data, error } = await supabase.from('profiles').select('*').eq('role', 'animatore').eq('oratory_id', oratoryId).order('first_name')
  if (error) throw error
  return (data as ProfileRow[]).map(mapProfile)
}

export async function listPendingRequests(actor: Profile): Promise<Profile[]> {
  const rows = await listAnimatori(actor)
  return rows.filter((p) => p.status === 'pending')
}

export async function getProfile(id: string): Promise<Profile | null> {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', id).maybeSingle()
  if (error || !data) return null
  return mapProfile(data as ProfileRow)
}

async function setStatus(actor: Profile, targetId: string, status: Profile['status']): Promise<Profile> {
  const target = await getProfile(targetId)
  if (!target) throw new Error('Animatore non trovato.')
  assertCanManageProfile(actor, target)
  const { data, error } = await supabase
    .from('profiles')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', targetId)
    .select()
    .single()
  if (error) throw error
  return mapProfile(data as ProfileRow)
}

export const approveProfile = (actor: Profile, targetId: string) => setStatus(actor, targetId, 'active')
export const rejectProfile = (actor: Profile, targetId: string) => setStatus(actor, targetId, 'rejected')
export const disableProfile = (actor: Profile, targetId: string) => setStatus(actor, targetId, 'disabled')
export const reactivateProfile = (actor: Profile, targetId: string) => setStatus(actor, targetId, 'active')

export async function updateAvatar(actor: Profile, avatarUrl: string | null): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    .update({ avatar_url: avatarUrl, updated_at: new Date().toISOString() })
    .eq('id', actor.id)
    .select()
    .single()
  if (error) throw error
  return mapProfile(data as ProfileRow)
}

export interface ProfileEdit {
  firstName: string
  lastName: string
  birthYear: number
  oratoryId: OratoryId
}

export async function editProfile(actor: Profile, targetId: string, edit: ProfileEdit): Promise<Profile> {
  const target = await getProfile(targetId)
  if (!target) throw new Error('Animatore non trovato.')
  assertCanManageProfile(actor, target)
  const { data, error } = await supabase
    .from('profiles')
    .update({
      first_name: edit.firstName,
      last_name: edit.lastName,
      birth_year: edit.birthYear,
      oratory_id: edit.oratoryId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', targetId)
    .select()
    .single()
  if (error) throw error
  return mapProfile(data as ProfileRow)
}
