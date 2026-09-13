export type Role = 'animatore' | 'admin_jerago' | 'admin_besnate' | 'admin_general'

export type ProfileStatus = 'pending' | 'active' | 'rejected' | 'disabled'

export type OratoryId = 'jerago' | 'besnate'

export interface Oratory {
  id: OratoryId
  name: string
  address: string
  latitude: number
  longitude: number
  gpsEnabled: boolean
  gpsRadius: number
  createdAt: string
  updatedAt: string
}

export interface Profile {
  id: string
  firstName: string
  lastName: string
  birthYear: number
  email: string
  role: Role
  oratoryId: OratoryId | null
  status: ProfileStatus
  avatarUrl: string | null
  createdAt: string
  updatedAt: string
}

export type TimeEntryType = 'entry' | 'exit'

export type TimbraturaMethod = 'gps' | 'qr' | 'manuale'

export type TrustStatus = 'ok' | 'watch' | 'suspicious'

export interface TimeEntry {
  id: string
  userId: string
  oratoryId: OratoryId
  type: TimeEntryType
  timestamp: string
  latitude: number | null
  longitude: number | null
  gpsAccuracy: number | null
  distanceFromOratory: number | null
  metodoTimbratura: TimbraturaMethod
  fiduciaScore: number | null
  fiduciaStato: TrustStatus | null
  fiduciaMotivi: string[]
  createdBy: string
  createdAt: string
}

export type FormTargetType = 'all' | 'oratory' | 'specific'

export interface FormDef {
  id: string
  title: string
  description: string
  createdBy: string
  targetType: FormTargetType
  targetOratories: OratoryId[]
  targetUserIds: string[]
  deadline: string | null
  status: 'open' | 'closed'
  createdAt: string
}

export type QuestionType = 'yesno' | 'text' | 'number' | 'date' | 'choice' | 'checkbox'

export interface FormQuestion {
  id: string
  formId: string
  question: string
  type: QuestionType
  options: string[]
  required: boolean
  sortOrder: number
}

export interface FormResponse {
  id: string
  formId: string
  userId: string
  submittedAt: string
}

export interface FormAnswer {
  id: string
  responseId: string
  questionId: string
  answer: string
}

export type AuditAction =
  | 'time_entry.create'
  | 'time_entry.edit'
  | 'profile.approve'
  | 'profile.reject'
  | 'profile.disable'
  | 'oratory.gps_update'
  | 'form.create'
  | 'form.response'

export interface AuditLog {
  id: string
  userId: string
  action: AuditAction
  targetType: string
  targetId: string
  metadata: Record<string, unknown>
  createdAt: string
}

export interface GeoResult {
  latitude: number
  longitude: number
  accuracy: number
}

export type GeoStatus = 'idle' | 'locating' | 'ok' | 'denied' | 'unavailable' | 'timeout'

/** Lun-Ven, indice 0-4 (mai sabato/domenica — attività oratorio in settimana). */
export const GIORNI_DISPONIBILITA = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì'] as const

export interface AvailabilityWeek {
  id: string
  oratoryId: OratoryId
  name: string
  dateInfo: string
  activeDays: number[]
  closed: boolean
  sortOrder: number
  createdAt: string
}

export type AvailabilityStatus = 'disponibile' | 'non_disponibile'

export interface AvailabilityResponse {
  id: string
  weekId: string
  userId: string
  dayIndex: number
  status: AvailabilityStatus | null
  note: string
  updatedAt: string
}
