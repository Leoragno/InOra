// Punteggio di fiducia anti-frode per le timbrature GPS — porting fedele
// dell'algoritmo `valutaFiducia` della vecchia app (Leoragno/timbratura).
// Non blocca mai una timbratura: la valuta e la classifica, così l'admin
// può rivedere quelle sospette invece di impedire all'animatore di timbrare.

import { distanceMeters } from './geo'
import type { TimbraturaMethod, TimeEntry, TrustStatus } from '../types'

const TRUST_RECENT_GPS_MS = 10 * 60 * 1000
const TRUST_QR_STALE_GPS_MS = 30 * 60 * 1000

export interface TrustGpsInput {
  lat: number
  lon: number
  accuracy: number
  distanceM: number
}

export interface TrustInput {
  metodo: TimbraturaMethod
  gps: TrustGpsInput | null
  /** Most recent entries first (already sorted desc), used for behavioural + jump checks. */
  ultime: TimeEntry[]
}

export interface TrustResult {
  score: number
  stato: TrustStatus
  motivi: string[]
}

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n))

function behaviouralAdjustment(ultime: TimeEntry[]): number {
  const withStatus = ultime.filter((t) => t.fiduciaStato)
  if (withStatus.length < 3) return 0
  const sample = withStatus.slice(0, 10)
  const green = sample.filter((t) => t.fiduciaStato === 'ok').length
  const red = sample.filter((t) => t.fiduciaStato === 'suspicious').length
  if (green >= Math.ceil(sample.length * 0.8)) return 10
  if (red >= Math.ceil(sample.length * 0.3)) return -10
  return 0
}

export function valutaFiducia({ metodo, gps, ultime }: TrustInput): TrustResult {
  const nowMs = Date.now()
  const motivi: string[] = []
  const gpsDist = gps?.distanceM
  let score = 50

  if (gpsDist != null && Number.isFinite(gpsDist)) {
    if (gpsDist <= 200) { score += 50; motivi.push('GPS entro 200 m dall\'oratorio') }
    else if (gpsDist <= 500) { score += 20; motivi.push('GPS tra 200 e 500 m dall\'oratorio') }
    else { score -= 20; motivi.push('GPS oltre 500 m dall\'oratorio') }
  } else {
    score -= 15
    motivi.push('GPS assente: penalità moderata')
  }

  const lastGpsStamp = ultime.find((t) => t.distanceFromOratory != null && Number.isFinite(t.distanceFromOratory))
  const lastGpsTime = lastGpsStamp ? new Date(lastGpsStamp.timestamp).getTime() : null
  const lastGpsAge = lastGpsTime ? nowMs - lastGpsTime : null
  if (gps || (lastGpsAge !== null && lastGpsAge <= TRUST_RECENT_GPS_MS)) {
    score += 20
    motivi.push('Dato GPS recente negli ultimi 5–10 minuti')
  } else {
    score -= 10
    motivi.push('Nessun dato GPS recente')
  }

  const prevCoords = lastGpsStamp?.latitude != null && lastGpsStamp?.longitude != null
    ? { lat: lastGpsStamp.latitude, lon: lastGpsStamp.longitude }
    : null
  let jumpMeters: number | null = null
  let jumpMinutes: number | null = null
  if (gps && prevCoords && lastGpsTime) {
    jumpMeters = distanceMeters(prevCoords.lat, prevCoords.lon, gps.lat, gps.lon)
    jumpMinutes = Math.max((nowMs - lastGpsTime) / 60000, 0.1)
    if (jumpMeters <= 500) { score += 10; motivi.push('Sessione coerente nella stessa area') }
    else if (jumpMeters >= 3000 && jumpMinutes <= 5) { score -= 30; motivi.push('Salto posizione anomalo rispetto all\'ultima timbratura') }
  }

  if (metodo === 'gps') { score += 10; motivi.push('Timbratura con GPS diretto') }
  else if (metodo === 'qr') {
    motivi.push('Timbratura tramite QR')
    if (gps && gpsDist != null && gpsDist > 500) { score -= 20; motivi.push('QR e GPS incoerenti') }
  }

  const behaviour = behaviouralAdjustment(ultime)
  if (behaviour > 0) motivi.push('Storico comportamentale prevalentemente affidabile')
  if (behaviour < 0) motivi.push('Storico comportamentale spesso sospetto')
  score += behaviour

  const strongSuspicion: string[] = []
  if (metodo === 'qr' && (!lastGpsAge || lastGpsAge > TRUST_QR_STALE_GPS_MS)) strongSuspicion.push('QR con GPS assente da oltre 30 minuti')
  if (gpsDist != null && Number.isFinite(gpsDist) && gpsDist > 3000) strongSuspicion.push('Ultima posizione oltre 3 km dall\'oratorio')
  if (jumpMeters !== null && jumpMeters >= 8000 && jumpMinutes !== null && jumpMinutes <= 2) strongSuspicion.push('Salto impossibile: almeno 8 km in 2 minuti')
  if (metodo === 'qr' && !lastGpsStamp && !gps) strongSuspicion.push('QR senza precedenti dati di vicinanza')

  let stato: TrustStatus = score >= 70 ? 'ok' : score >= 40 ? 'watch' : 'suspicious'
  if (strongSuspicion.length) {
    stato = 'suspicious'
    motivi.push(...strongSuspicion)
  }

  return { score: clamp(Math.round(score), 0, 100), stato, motivi }
}

export const TRUST_LABEL: Record<TrustStatus, string> = {
  ok: 'Affidabile',
  watch: 'Da monitorare',
  suspicious: 'Sospetta',
}

export const TRUST_COLOR: Record<TrustStatus, { bg: string; text: string; dot: string }> = {
  ok: { bg: 'bg-good-50', text: 'text-good-700', dot: 'bg-good-500' },
  watch: { bg: 'bg-warn-50', text: 'text-warn-700', dot: 'bg-warn-500' },
  suspicious: { bg: 'bg-bad-50', text: 'text-bad-600', dot: 'bg-bad-500' },
}
