import { db, tick } from './db'
import { assertCanManageOratory } from '../utils/authz'
import { writeAudit } from './auditService'
import type { Oratory, OratoryId, Profile } from '../types'

export async function listOratories(): Promise<Oratory[]> {
  return tick([...db.get().oratories])
}

export async function getOratory(id: OratoryId): Promise<Oratory | null> {
  return tick(db.get().oratories.find((o) => o.id === id) ?? null)
}

export interface GpsUpdate {
  gpsEnabled: boolean
  gpsRadius: number
}

export async function updateGpsSettings(actor: Profile, id: OratoryId, update: GpsUpdate): Promise<Oratory> {
  assertCanManageOratory(actor, id)
  const database = db.get()
  const oratory = database.oratories.find((o) => o.id === id)
  if (!oratory) throw new Error('Oratorio non trovato.')
  oratory.gpsEnabled = update.gpsEnabled
  oratory.gpsRadius = update.gpsRadius
  oratory.updatedAt = new Date().toISOString()
  db.save()
  writeAudit(actor, 'oratory.gps_update', 'oratory', id, { ...update })
  return tick({ ...oratory })
}
