import { db, tick, uid } from './db'
import { distanceMeters } from '../lib/geo'
import { GPS_CONFIG } from '../lib/gpsRefine'
import { valutaFiducia } from '../lib/trust'
import { assertCanManageOratory } from '../utils/authz'
import { writeAudit } from './auditService'
import type { GeoResult, OratoryId, Profile, TimbraturaMethod, TimeEntry } from '../types'

export class TimeEntryStateError extends Error {}

const DUPLICATE_TAP_WINDOW_MS = 2 * 60 * 1000

function entriesForUser(userId: string): TimeEntry[] {
  return db.get().timeEntries
    .filter((e) => e.userId === userId)
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
}

/** The most recent entry decides whether the animatore is currently clocked in. */
export function getOpenEntry(userId: string): TimeEntry | null {
  const rows = entriesForUser(userId)
  const last = rows[rows.length - 1]
  return last && last.type === 'entry' ? last : null
}

/** The most recent entry/exit session for today — a day can hold several sessions (e.g. morning + evening shift). */
export function getTodayPair(userId: string): { entry: TimeEntry | null; exit: TimeEntry | null } {
  const today = new Date()
  const rows = entriesForUser(userId).filter((e) => new Date(e.timestamp).toDateString() === today.toDateString())
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
function assertNotDuplicateTap(userId: string, type: TimeEntry['type']) {
  const rows = entriesForUser(userId)
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
function assessGps(oratoryId: OratoryId, geo: GeoResult | null): GpsAssessment {
  const oratory = db.get().oratories.find((o) => o.id === oratoryId)
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
  const database = db.get()
  const ultime = entriesForUser(actor.id).slice(-5).reverse()
  const trust = valutaFiducia({
    metodo,
    gps: gps.distance != null && gps.latitude != null && gps.longitude != null && gps.accuracy != null
      ? { lat: gps.latitude, lon: gps.longitude, accuracy: gps.accuracy, distanceM: gps.distance }
      : null,
    ultime,
  })
  const now = new Date().toISOString()
  const entry: TimeEntry = {
    id: uid('te'), userId: actor.id, oratoryId, type, timestamp: now,
    latitude: gps.latitude, longitude: gps.longitude, gpsAccuracy: gps.accuracy, distanceFromOratory: gps.distance,
    metodoTimbratura: metodo, fiduciaScore: trust.score, fiduciaStato: trust.stato, fiduciaMotivi: trust.motivi,
    createdBy: actor.id, createdAt: now,
  }
  database.timeEntries.push(entry)
  db.save()
  writeAudit(actor, 'time_entry.create', 'time_entry', entry.id, {
    type, distance: gps.distance, accuracy: gps.accuracy, fiduciaScore: trust.score, fiduciaStato: trust.stato,
  })
  return tick({ entry, warning: gps.warning })
}

/** Entrata: richiede GPS se l'oratorio lo impone (mai bloccante — vedi assessGps). */
export async function clockIn(actor: Profile, oratoryId: OratoryId, geo: GeoResult | null, metodo: TimbraturaMethod = 'gps'): Promise<TimbraturaResult> {
  assertNotDuplicateTap(actor.id, 'entry')
  if (getOpenEntry(actor.id)) throw new TimeEntryStateError('Hai già una timbratura di entrata aperta.')
  const gps = assessGps(oratoryId, geo)
  return recordEntry(actor, oratoryId, 'entry', gps, metodo)
}

/** Uscita: non richiede mai il GPS — non c'è incentivo a falsificare l'uscita. */
export async function clockOut(actor: Profile, oratoryId: OratoryId, metodo: TimbraturaMethod = 'manuale'): Promise<TimbraturaResult> {
  assertNotDuplicateTap(actor.id, 'exit')
  const open = getOpenEntry(actor.id)
  if (!open) throw new TimeEntryStateError('Non hai una timbratura di entrata aperta.')
  return recordEntry(actor, oratoryId, 'exit', { latitude: null, longitude: null, accuracy: null, distance: null, warning: null }, metodo)
}

/** Distance-only preview (no entry recorded) — used to render the "sei nell'area" banner on Home. */
export function previewDistance(oratoryId: OratoryId, geo: GeoResult | null): { distance: number; accuracy: number } | null {
  const oratory = db.get().oratories.find((o) => o.id === oratoryId)
  if (!oratory || !oratory.gpsEnabled || !geo) return null
  const distance = distanceMeters(geo.latitude, geo.longitude, oratory.latitude, oratory.longitude)
  return { distance, accuracy: geo.accuracy }
}

export async function listEntriesForUser(userId: string, monthStart: Date, monthEnd: Date): Promise<TimeEntry[]> {
  const rows = entriesForUser(userId).filter((e) => {
    const t = new Date(e.timestamp)
    return t >= monthStart && t <= monthEnd
  })
  return tick(rows)
}

export async function listTodayForOratory(oratoryId: OratoryId): Promise<TimeEntry[]> {
  const today = new Date()
  const rows = db.get().timeEntries.filter((e) => e.oratoryId === oratoryId && new Date(e.timestamp).toDateString() === today.toDateString())
  return tick(rows)
}

export interface ManualEntryEdit {
  entryTimestamp?: string
  exitTimestamp?: string
}

/** Admin correction of a day's clock-in/out pair. Always writes an audit_logs row. */
export async function manualCorrectDay(actor: Profile, userId: string, oratoryId: OratoryId, dayIso: string, edit: ManualEntryEdit): Promise<void> {
  assertCanManageOratory(actor, oratoryId)
  const database = db.get()
  const day = new Date(dayIso)
  const rows = database.timeEntries.filter((e) => e.userId === userId && new Date(e.timestamp).toDateString() === day.toDateString())
  const before = rows.map((r) => ({ id: r.id, type: r.type, timestamp: r.timestamp }))

  const blank = { latitude: null, longitude: null, gpsAccuracy: null, distanceFromOratory: null, metodoTimbratura: 'manuale' as const, fiduciaScore: null, fiduciaStato: null, fiduciaMotivi: [] as string[] }

  if (edit.entryTimestamp) {
    let entry = rows.find((r) => r.type === 'entry')
    if (!entry) {
      entry = { id: uid('te'), userId, oratoryId, type: 'entry', timestamp: edit.entryTimestamp, ...blank, createdBy: actor.id, createdAt: new Date().toISOString() }
      database.timeEntries.push(entry)
    } else {
      entry.timestamp = edit.entryTimestamp
    }
  }
  if (edit.exitTimestamp) {
    let exit = rows.find((r) => r.type === 'exit')
    if (!exit) {
      exit = { id: uid('te'), userId, oratoryId, type: 'exit', timestamp: edit.exitTimestamp, ...blank, createdBy: actor.id, createdAt: new Date().toISOString() }
      database.timeEntries.push(exit)
    } else {
      exit.timestamp = edit.exitTimestamp
    }
  }
  db.save()
  writeAudit(actor, 'time_entry.edit', 'time_entry_day', `${userId}:${day.toDateString()}`, { before, edit })
}
