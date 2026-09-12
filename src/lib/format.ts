const MESI_IT = [
  'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
  'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre',
]

const MESI_ABBR_IT = ['GEN', 'FEB', 'MAR', 'APR', 'MAG', 'GIU', 'LUG', 'AGO', 'SET', 'OTT', 'NOV', 'DIC']

const GIORNI_IT = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab']

export function formatTime(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
}

export function formatDayMonth(iso: string): { day: string; month: string } {
  const d = new Date(iso)
  return { day: String(d.getDate()).padStart(2, '0'), month: MESI_ABBR_IT[d.getMonth()] }
}

export function formatMonthYear(year: number, month: number): string {
  return `${MESI_IT[month]} ${year}`
}

export function formatFullDate(iso: string): string {
  const d = new Date(iso)
  return `${d.getDate()} ${MESI_IT[d.getMonth()]} ${d.getFullYear()}`
}

export function weekdayShort(date: Date): string {
  return GIORNI_IT[date.getDay()]
}

/** Minutes between two ISO timestamps, formatted as "4h 48m". */
export function formatDurationMinutes(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60)
  const m = Math.round(totalMinutes % 60)
  if (h <= 0) return `${m}m`
  return `${h}h ${String(m).padStart(2, '0')}m`
}

export function minutesBetween(startIso: string, endIso: string): number {
  return (new Date(endIso).getTime() - new Date(startIso).getTime()) / 60000
}

export function initials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase()
}

export function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}
