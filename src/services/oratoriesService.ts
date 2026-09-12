import { supabase } from '../lib/supabaseClient'
import { assertCanManageOratory } from '../utils/authz'
import type { Oratory, OratoryId, Profile } from '../types'

interface OratoryRow {
  id: OratoryId
  name: string
  address: string
  latitude: number
  longitude: number
  gps_enabled: boolean
  gps_radius: number
  created_at: string
  updated_at: string
}

function mapOratory(row: OratoryRow): Oratory {
  return {
    id: row.id,
    name: row.name,
    address: row.address,
    latitude: row.latitude,
    longitude: row.longitude,
    gpsEnabled: row.gps_enabled,
    gpsRadius: row.gps_radius,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export async function listOratories(): Promise<Oratory[]> {
  const { data, error } = await supabase.from('oratories').select('*').order('name')
  if (error) throw error
  return (data as OratoryRow[]).map(mapOratory)
}

export async function getOratory(id: OratoryId): Promise<Oratory | null> {
  const { data, error } = await supabase.from('oratories').select('*').eq('id', id).maybeSingle()
  if (error || !data) return null
  return mapOratory(data as OratoryRow)
}

export interface GpsUpdate {
  gpsEnabled: boolean
  gpsRadius: number
}

export async function updateGpsSettings(actor: Profile, id: OratoryId, update: GpsUpdate): Promise<Oratory> {
  assertCanManageOratory(actor, id)
  const { data, error } = await supabase
    .from('oratories')
    .update({ gps_enabled: update.gpsEnabled, gps_radius: update.gpsRadius, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return mapOratory(data as OratoryRow)
}
