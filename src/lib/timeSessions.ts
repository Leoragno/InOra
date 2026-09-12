import { minutesBetween } from './format'
import type { TimeEntry } from '../types'

export interface Session {
  entry: TimeEntry
  exit: TimeEntry | null
}

export interface DaySessions {
  dateKey: string
  date: Date
  sessions: Session[]
}

/**
 * Groups a user's time entries into per-day sessions, matching each entry to
 * the exit that follows it. A day can legitimately hold more than one
 * session (an interrupted shift, morning + evening) — grouping this way
 * keeps the day's total an accurate sum instead of the span between the
 * first entry and the last exit, which would bridge unrelated sessions.
 */
export function groupSessionsByDay(entries: TimeEntry[]): DaySessions[] {
  const sorted = [...entries].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
  const map = new Map<string, DaySessions>()
  const ensure = (iso: string): DaySessions => {
    const key = new Date(iso).toDateString()
    if (!map.has(key)) map.set(key, { dateKey: key, date: new Date(iso), sessions: [] })
    return map.get(key)!
  }
  let open: TimeEntry | null = null
  for (const e of sorted) {
    if (e.type === 'entry') {
      open = e
    } else if (open) {
      ensure(open.timestamp).sessions.push({ entry: open, exit: e })
      open = null
    }
  }
  if (open) ensure(open.timestamp).sessions.push({ entry: open, exit: null })
  return [...map.values()].sort((a, b) => b.date.getTime() - a.date.getTime())
}

export function dayTotalMinutes(day: DaySessions): number {
  return day.sessions.reduce((sum, s) => (s.exit ? sum + minutesBetween(s.entry.timestamp, s.exit.timestamp) : sum), 0)
}

export function isDayOpen(day: DaySessions): boolean {
  return day.sessions.some((s) => !s.exit)
}
