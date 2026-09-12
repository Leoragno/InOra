// Porting delle statistiche admin della vecchia app (buildChartData_orario,
// buildChartData_giorni, calcolaOreAnimatore, renderRank/renderDettaglio in
// admin.html / admin-parrocchia.html): stesse metriche, ma il totale minuti
// per animatore riusa groupSessionsByDay/dayTotalMinutes già presenti in
// questa app invece del pairing "primo ingresso/prima uscita successiva"
// della versione originale.

import { db, tick } from './db'
import { scopedOratories } from '../utils/authz'
import { groupSessionsByDay, dayTotalMinutes } from '../lib/timeSessions'
import type { OratoryId, Profile, TimeEntry } from '../types'

export interface StatsFilters {
  dal: string
  al: string
  oratoryId: OratoryId | null
  animatoreId: string | null
}

export interface StatsKpi {
  animatoriAttivi: number
  giorniAttivi: number
  totTimbrature: number
  totMinuti: number
}

export interface StatsRankRow {
  profile: Profile
  minuti: number
  giorni: number
}

export interface StatsDetailRow extends StatsRankRow {
  nIn: number
  nOut: number
  ultimo: TimeEntry | null
}

export interface StatsResult {
  kpi: StatsKpi
  hourlyIn: { label: string; value: number }[]
  hourlyOut: { label: string; value: number }[]
  byDay: { label: string; value: number }[]
  rank: StatsRankRow[]
  detail: StatsDetailRow[]
}

const HOUR_RANGE = { from: 7, to: 21 }

function hourlyDistribution(entries: TimeEntry[], type: TimeEntry['type']) {
  const counts = new Map<number, number>()
  for (let h = HOUR_RANGE.from; h <= HOUR_RANGE.to; h++) counts.set(h, 0)
  for (const e of entries) {
    if (e.type !== type) continue
    const h = new Date(e.timestamp).getHours()
    if (counts.has(h)) counts.set(h, (counts.get(h) ?? 0) + 1)
  }
  return [...counts.entries()].map(([h, value]) => ({ label: `${String(h).padStart(2, '0')}`, value }))
}

export async function getStats(actor: Profile, filters: StatsFilters): Promise<StatsResult> {
  const scoped = scopedOratories(actor)
  const oratoryIds = filters.oratoryId ? scoped.filter((o) => o === filters.oratoryId) : scoped
  const database = db.get()
  const start = new Date(`${filters.dal}T00:00:00`)
  const end = new Date(`${filters.al}T23:59:59.999`)

  const profiles = database.profiles.filter((p) => p.role === 'animatore' && p.oratoryId && oratoryIds.includes(p.oratoryId))
  const profileIds = new Set(profiles.map((p) => p.id))

  let entries = database.timeEntries.filter((e) => {
    const t = new Date(e.timestamp)
    return profileIds.has(e.userId) && oratoryIds.includes(e.oratoryId) && t >= start && t <= end
  })
  if (filters.animatoreId) entries = entries.filter((e) => e.userId === filters.animatoreId)

  const byUser = new Map<string, TimeEntry[]>()
  for (const e of entries) {
    if (!byUser.has(e.userId)) byUser.set(e.userId, [])
    byUser.get(e.userId)!.push(e)
  }

  const rank: StatsRankRow[] = []
  const detail: StatsDetailRow[] = []
  let totMinuti = 0

  for (const [userId, rows] of byUser) {
    const profile = profiles.find((p) => p.id === userId)
    if (!profile) continue
    const days = groupSessionsByDay(rows)
    const minuti = Math.round(days.reduce((sum, d) => sum + dayTotalMinutes(d), 0))
    totMinuti += minuti
    const nIn = rows.filter((r) => r.type === 'entry').length
    const nOut = rows.filter((r) => r.type === 'exit').length
    const ultimo = [...rows].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0] ?? null
    rank.push({ profile, minuti, giorni: days.length })
    detail.push({ profile, minuti, giorni: days.length, nIn, nOut, ultimo })
  }
  rank.sort((a, b) => b.minuti - a.minuti)
  detail.sort((a, b) => b.minuti - a.minuti)

  const dayUsers = new Map<string, Set<string>>()
  for (const e of entries) {
    if (e.type !== 'entry') continue
    const key = new Date(e.timestamp).toDateString()
    if (!dayUsers.has(key)) dayUsers.set(key, new Set())
    dayUsers.get(key)!.add(e.userId)
  }
  const sortedDayKeys = [...dayUsers.keys()].sort((a, b) => new Date(a).getTime() - new Date(b).getTime())
  const byDay = sortedDayKeys.map((k) => {
    const d = new Date(k)
    return { label: `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`, value: dayUsers.get(k)!.size }
  })

  const kpi: StatsKpi = {
    animatoriAttivi: byUser.size,
    giorniAttivi: sortedDayKeys.length,
    totTimbrature: entries.length,
    totMinuti,
  }

  return tick({
    kpi,
    hourlyIn: hourlyDistribution(entries, 'entry'),
    hourlyOut: hourlyDistribution(entries, 'exit'),
    byDay,
    rank,
    detail,
  })
}
