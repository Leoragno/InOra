// Fase 2 della migrazione a Supabase: le timbrature (con raffinamento GPS e
// punteggio di fiducia) ora scrivono/leggono dal database reale invece del
// demo-store locale. getOpenEntry/getTodayPair erano funzioni sincrone sul
// demo-store: qui diventano async, i chiamanti sono stati aggiornati di
// conseguenza.
import { supabase } from '../lib/supabaseClient'
import { distanceMeters } from '../lib/geo'
import { GPS_CONFIG } from '../lib/gpsRefine'
import { valutaFiducia } from '../lib/trust'
import { assertCanManageOratory } from '../utils/authz'
import { getOratory } from './oratoriesService'
import { writeAudit } from './auditService'
import type { GeoResult, OratoryId, Profile, TimbraturaMethod, TimeEntry, TrustStatus } from '../types'

export class TimeEntryStateError extends Error {}

const DUPLICATE_TAP_WINDOW_MS = 2 * 60 * 1000

interface TimeEntryRow {
  id: string
  user_id: string
  oratory_id: OratoryId
  type: TimeEntry['type']
  timestamp: string
  latitude: number | null
  longitude: number | null
  gps_accuracy: number | null
  distance_from_oratory: number | null
  metodo_timbratura: TimbraturaMethod
  fiducia_score: number | null
  fiducia_stato: TrustStatus | null
  fiducia_motivi: string[]
  created_by: string
  created_at: string
}

function mapEntry(row: TimeEntryRow): TimeEntry {
  return {
    id: row.id,
    userId: row.user_id,
    oratoryId: row.oratory_id,
    type: row.type,
    timestamp: row.timestamp,
    latitude: row.latitude,
    longitude: row.longitude,
    gpsAccuracy: row.gps_accuracy,
    distanceFromOratory: row.distance_from_oratory,
    metodoTimbratura: row.metodo_timbratura,
    fiduciaScore: row.fiducia_score,
    fiduciaStato: row.fiducia_stato,
    fiduciaMotivi: row.fiducia_motivi ?? [],
    createdBy: row.created_by,
    createdAt: row.created_at,
  }
}

async function entriesForUser(userId: string, limit = 20): Promise<TimeEntry[]> {
  const { data, error } = await supabase
    .from('time_entries')
    .select('*')
    .eq('user_id', userId)
    .order('timestamp', { ascending: false })
    .limit(limit)
  if (error) throw error
  return (data as TimeEntryRow[]).map(mapEntry).reverse()
}

/** The most recent entry decides whether the animatore is currently clocked in. */
export async function getOpenEntry(userId: string): Promise<TimeEntry | null> {
  const rows = await entriesForUser(userId, 1)
  const last = rows[rows.length - 1]
  return last && last.type === 'entry' ? last : null
}

/** The most recent entry/exit session for today — a day can hold several sessions (e.g. morning + evening shift). */
export async function getTodayPair(userId: string): Promise<{ entry: TimeEntry | null; exit: TimeEntry | null }> {
  const today = new Date()
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const { data, error } = await supabase
    .from('time_entries')
    .select('*')
    .eq('user_id', userId)
    .gte('timestamp', startOfDay.toISOString())
    .order('timestamp', { ascending: true })
  if (error) throw error
  const rows = (data as TimeEntryRow[]).map(mapEntry)

  let lastCompleted: { entry: TimeEntry | null; exit: TimeEntry | null } = { entry: null, exit: null }
  let openEntry: TimeEntry | null = null
  for (const row of rows) {
    if (row.type === 'entry') {
      openEntry = row
    } else if (openEntry) {
      lastCompleted = { entry: openEntry, exit: row }
      openEntry = null
    }
  }
  return openEntry ? { entry: openEntry, exit: null } : lastCompleted
}

/** Blocks an accidental double-tap on the same button, mirroring the old app's 2-minute cooldown. */
async function assertNotDuplicateTap(userId: string, type: TimeEntry['type']) {
  const rows = await entriesForUser(userId, 1)
  const last = rows[rows.length - 1]
  if (!last || last.type !== type) return
  const elapsed = Date.now() - new Date(last.timestamp).getTime()
  if (elapsed < DUPLICATE_TAP_WINDOW_MS) {
    const seconds = Math.round(elapsed / 1000)
    throw new TimeEntryStateError(`Hai già timbrato ${seconds}s fa. Attendi qualche minuto prima di ripetere.`)
  }
}

interface GpsAssessment {
  latitude: number | null
  longitude: number | null
  accuracy: number | null
  distance: number | null
  /** Saved anyway, but flagged: too far, or accuracy/position too unreliable to trust outright. */
  warning: string | null
}

/**
 * Distance + reliability check — NEVER blocks the timbratura. A position far
 * from the oratory, or missing altogether, still gets saved; it's flagged
 * with a warning message (surfaced to the user) and a lower fiducia score
 * (surfaced to the admin) instead. Mirrors the old app's philosophy: GPS on
 * a phone is flaky enough that hard-blocking causes more harm than fraud.
 */
async function assessGps(oratoryId: OratoryId, geo: GeoResult | null): Promise<GpsAssessment> {
  const oratory = await getOratory(oratoryId)
  if (!oratory) throw new Error('Oratorio non trovato.')
  if (!oratory.gpsEnabled) {
    return { latitude: null, longitude: null, accuracy: null, distance: null, warning: null }
  }
  if (!geo) {
    return { latitude: null, longitude: null, accuracy: null, distance: null, warning: 'GPS assente: timbratura salvata e segnata per revisione.' }
  }
  const distance = distanceMeters(geo.latitude, geo.longitude, oratory.latitude, oratory.longitude)
  const acc = Math.round(geo.accuracy)
  const maxDistanzaConBuffer = oratory.gpsRadius + GPS_CONFIG.DISTANCE_BUFFER
  const precisioneScarsa = acc > 150
  const isWithinRange = distance <= maxDistanzaConBuffer
  const isCloseEnough = distance <= maxDistanzaConBuffer + (precisioneScarsa ? acc * 0.7 : acc)

  let warning: string | null = null
  if (!isWithinRange && !isCloseEnough) warning = 'Posizione lontana: timbratura salvata per revisione.'
  else if (!isWithinRange && isCloseEnough) warning = 'Posizione rilevata con bassa precisione. Timbratura accettata.'

  return { latitude: geo.latitude, longitude: geo.longitude, accuracy: acc, distance: Math.round(distance), warning }
}

export interface TimbraturaResult {
  entry: TimeEntry
  warning: string | null
}

async function recordEntry(
  actor: Profile,
  oratoryId: OratoryId,
  type: TimeEntry['type'],
  gps: GpsAssessment,
  metodo: TimbraturaMethod,
): Promise<TimbraturaResult> {
  const ultime = (await entriesForUser(actor.id, 5)).slice().reverse()
  const trust = valutaFiducia({
    metodo,
    gps: gps.distance != null && gps.latitude != null && gps.longitude != null && gps.accuracy != null
      ? { lat: gps.latitude, lon: gps.longitude, accuracy: gps.accuracy, distanceM: gps.distance }
      : null,
    ultime,
  })
  const { data, error } = await supabase
    .from('time_entries')
    .insert({
      user_id: actor.id,
      oratory_id: oratoryId,
      type,
      timestamp: new Date().toISOString(),
      latitude: gps.latitude,
      longitude: gps.longitude,
      gps_accuracy: gps.accuracy,
      distance_from_oratory: gps.distance,
      metodo_timbratura: metodo,
      fiducia_score: trust.score,
      fiducia_stato: trust.stato,
      fiducia_motivi: trust.motivi,
      created_by: actor.id,
    })
    .select()
    .single()
  if (error) throw error
  const entry = mapEntry(data as TimeEntryRow)
  await writeAudit(actor, 'time_entry.create', 'time_entry', entry.id, {
    type, distance: gps.distance, accuracy: gps.accuracy, fiduciaScore: trust.score, fiduciaStato: trust.stato,
  })
  return { entry, warning: gps.warning }
}

/** Entrata: richiede GPS se l'oratorio lo impone (mai bloccante — vedi assessGps). */
export async function clockIn(actor: Profile, oratoryId: OratoryId, geo: GeoResult | null, metodo: TimbraturaMethod = 'gps'): Promise<TimbraturaResult> {
  await assertNotDuplicateTap(actor.id, 'entry')
  if (await getOpenEntry(actor.id)) throw new TimeEntryStateError('Hai già una timbratura di entrata aperta.')
  const gps = await assessGps(oratoryId, geo)
  return recordEntry(actor, oratoryId, 'entry', gps, metodo)
}

/** Uscita: non richiede mai il GPS — non c'è incentivo a falsificare l'uscita. */
export async function clockOut(actor: Profile, oratoryId: OratoryId, metodo: TimbraturaMethod = 'manuale'): Promise<TimbraturaResult> {
  await assertNotDuplicateTap(actor.id, 'exit')
  const open = await getOpenEntry(actor.id)
  if (!open) throw new TimeEntryStateError('Non hai una timbratura di entrata aperta.')
  return recordEntry(actor, oratoryId, 'exit', { latitude: null, longitude: null, accuracy: null, distance: null, warning: null }, metodo)
}

/** Distance-only preview (no entry recorded) — used to render the "sei nell'area" banner on Home. */
export async function previewDistance(oratoryId: OratoryId, geo: GeoResult | null): Promise<{ distance: number; accuracy: number } | null> {
  const oratory = await getOratory(oratoryId)
  if (!oratory || !oratory.gpsEnabled || !geo) return null
  const distance = distanceMeters(geo.latitude, geo.longitude, oratory.latitude, oratory.longitude)
  return { distance, accuracy: geo.accuracy }
}

export async function listEntriesForUser(userId: string, monthStart: Date, monthEnd: Date): Promise<TimeEntry[]> {
  const { data, error } = await supabase
    .from('time_entries')
    .select('*')
    .eq('user_id', userId)
    .gte('timestamp', monthStart.toISOString())
    .lte('timestamp', monthEnd.toISOString())
    .order('timestamp', { ascending: true })
  if (error) throw error
  return (data as TimeEntryRow[]).map(mapEntry)
}

/** Usato dalle statistiche admin: tutte le timbrature di più oratori in un intervallo. */
export async function listEntriesForOratories(oratoryIds: OratoryId[], start: Date, end: Date): Promise<TimeEntry[]> {
  if (!oratoryIds.length) return []
  const { data, error } = await supabase
    .from('time_entries')
    .select('*')
    .in('oratory_id', oratoryIds)
    .gte('timestamp', start.toISOString())
    .lte('timestamp', end.toISOString())
    .order('timestamp', { ascending: true })
  if (error) throw error
  return (data as TimeEntryRow[]).map(mapEntry)
}

export async function listTodayForOratory(oratoryId: OratoryId): Promise<TimeEntry[]> {
  const today = new Date()
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const endOfDay = new Date(startOfDay.getTime() + 86399999)
  const { data, error } = await supabase
    .from('time_entries')
    .select('*')
    .eq('oratory_id', oratoryId)
    .gte('timestamp', startOfDay.toISOString())
    .lte('timestamp', endOfDay.toISOString())
  if (error) throw error
  return (data as TimeEntryRow[]).map(mapEntry)
}

export interface ManualEntryEdit {
  entryTimestamp?: string
  exitTimestamp?: string
}

/** Admin correction of a day's clock-in/out pair. Always writes an audit_logs row. */
export async function manualCorrectDay(actor: Profile, userId: string, oratoryId: OratoryId, dayIso: string, edit: ManualEntryEdit): Promise<void> {
  assertCanManageOratory(actor, oratoryId)
  const day = new Date(dayIso)
  const startOfDay = new Date(day.getFullYear(), day.getMonth(), day.getDate())
  const endOfDay = new Date(startOfDay.getTime() + 86399999)

  const { data, error } = await supabase
    .from('time_entries')
    .select('*')
    .eq('user_id', userId)
    .gte('timestamp', startOfDay.toISOString())
    .lte('timestamp', endOfDay.toISOString())
  if (error) throw error
  const rows = (data as TimeEntryRow[]).map(mapEntry)
  const before = rows.map((r) => ({ id: r.id, type: r.type, timestamp: r.timestamp }))

  const blank = {
    latitude: null, longitude: null, gps_accuracy: null, distance_from_oratory: null,
    metodo_timbratura: 'manuale' as const, fiducia_score: null, fiducia_stato: null, fiducia_motivi: [] as string[],
  }

  if (edit.entryTimestamp) {
    const entry = rows.find((r) => r.type === 'entry')
    if (!entry) {
      const { error: insertError } = await supabase.from('time_entries').insert({
        user_id: userId, oratory_id: oratoryId, type: 'entry', timestamp: edit.entryTimestamp, created_by: actor.id, ...blank,
      })
      if (insertError) throw insertError
    } else {
      const { error: updateError } = await supabase.from('time_entries').update({ timestamp: edit.entryTimestamp }).eq('id', entry.id)
      if (updateError) throw updateError
    }
  }
  if (edit.exitTimestamp) {
    const exit = rows.find((r) => r.type === 'exit')
    if (!exit) {
      const { error: insertError } = await supabase.from('time_entries').insert({
        user_id: userId, oratory_id: oratoryId, type: 'exit', timestamp: edit.exitTimestamp, created_by: actor.id, ...blank,
      })
      if (insertError) throw insertError
    } else {
      const { error: updateError } = await supabase.from('time_entries').update({ timestamp: edit.exitTimestamp }).eq('id', exit.id)
      if (updateError) throw updateError
    }
  }
  await writeAudit(actor, 'time_entry.edit', 'time_entry_day', `${userId}:${day.toDateString()}`, { before, edit })
}
