// ============================================================================
// DEMO DATA STORE — sostituire con Supabase (Postgres + RLS) prima del rilascio.
//
// Questo file simula, in localStorage, esattamente le tabelle e i vincoli
// descritti nello schema Supabase target (profiles, oratories, time_entries,
// forms, form_questions, form_responses, form_answers, audit_logs). Ogni
// funzione dei service (profilesService, timeEntriesService, ecc.) applica
// già i controlli di autorizzazione per ruolo che, in produzione, devono
// essere applicati ANCHE — e soprattutto — da RLS lato database: i controlli
// qui non bastano da soli in un backend reale, ma tengono la UI onesta nel
// frattempo e rendono il porting diretto (stessa forma delle funzioni,
// stesse regole, solo lo storage cambia da localStorage a supabase-js).
// ============================================================================

import type {
  AuditLog,
  FormAnswer,
  FormDef,
  FormQuestion,
  FormResponse,
  Oratory,
  OratoryId,
  Profile,
  TimeEntry,
} from '../types'

const STORAGE_KEY = 'job_demo_db_v2'
const SESSION_KEY = 'job_demo_session_v1'

interface DemoAccount {
  profileId: string
  email: string
  password: string
}

interface Db {
  profiles: Profile[]
  accounts: DemoAccount[]
  oratories: Oratory[]
  timeEntries: TimeEntry[]
  forms: FormDef[]
  formQuestions: FormQuestion[]
  formResponses: FormResponse[]
  formAnswers: FormAnswer[]
  auditLogs: AuditLog[]
}

let uidCounter = 0
export function uid(prefix: string): string {
  uidCounter += 1
  return `${prefix}_${Date.now().toString(36)}${uidCounter.toString(36)}`
}

function nowIso(): string {
  return new Date().toISOString()
}

function daysAgo(n: number, hour: number, minute: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  d.setHours(hour, minute, 0, 0)
  return d.toISOString()
}

function seed(): Db {
  const oratories: Oratory[] = [
    {
      id: 'jerago',
      name: 'Jerago',
      address: 'Via Roma 1, Jerago con Orago (VA)',
      latitude: 45.6973,
      longitude: 8.7981,
      gpsEnabled: true,
      gpsRadius: 50,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    },
    {
      id: 'besnate',
      name: 'Besnate',
      address: 'Piazza Chiesa 3, Besnate (VA)',
      latitude: 45.6701,
      longitude: 8.8283,
      gpsEnabled: false,
      gpsRadius: 75,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    },
  ]

  const mkProfile = (p: Partial<Profile> & Pick<Profile, 'firstName' | 'lastName' | 'role' | 'email'>): Profile => ({
    id: uid('user'),
    birthYear: 2007,
    oratoryId: 'jerago',
    status: 'active',
    avatarUrl: null,
    createdAt: nowIso(),
    updatedAt: nowIso(),
    ...p,
  })

  const adminJerago = mkProfile({ firstName: 'Admin', lastName: 'Jerago', role: 'admin_jerago', email: 'admin.jerago@job.app', oratoryId: 'jerago', birthYear: 1985 })
  const adminBesnate = mkProfile({ firstName: 'Admin', lastName: 'Besnate', role: 'admin_besnate', email: 'admin.besnate@job.app', oratoryId: 'besnate', birthYear: 1985 })
  const adminGeneral = mkProfile({ firstName: 'Admin', lastName: 'Generale', role: 'admin_general', email: 'admin@job.app', oratoryId: null, birthYear: 1980 })

  const marco = mkProfile({ firstName: 'Marco', lastName: 'Rossi', role: 'animatore', email: 'marco.rossi@job.app', oratoryId: 'jerago', birthYear: 2006 })
  const luca = mkProfile({ firstName: 'Luca', lastName: 'Bianchi', role: 'animatore', email: 'luca.bianchi@job.app', oratoryId: 'jerago', birthYear: 2007 })
  const anna = mkProfile({ firstName: 'Anna', lastName: 'Verdi', role: 'animatore', email: 'anna.verdi@job.app', oratoryId: 'jerago', birthYear: 2005 })
  const matteo = mkProfile({ firstName: 'Matteo', lastName: 'Neri', role: 'animatore', email: 'matteo.neri@job.app', oratoryId: 'besnate', birthYear: 2006 })
  const giulia = mkProfile({ firstName: 'Giulia', lastName: 'Ferrari', role: 'animatore', email: 'giulia.ferrari@job.app', oratoryId: 'besnate', birthYear: 2007 })
  const leonardo = mkProfile({ firstName: 'Leonardo', lastName: 'Ragno', role: 'admin_general', email: 'leonardo@email.it', oratoryId: null, birthYear: 2007 })

  const profiles = [adminJerago, adminBesnate, adminGeneral, marco, luca, anna, matteo, giulia, leonardo]

  const accounts: DemoAccount[] = [
    { profileId: adminJerago.id, email: adminJerago.email, password: 'admin123' },
    { profileId: adminBesnate.id, email: adminBesnate.email, password: 'admin123' },
    { profileId: adminGeneral.id, email: adminGeneral.email, password: 'admin123' },
    { profileId: marco.id, email: marco.email, password: 'password12' },
    { profileId: luca.id, email: luca.email, password: 'password12' },
    { profileId: anna.id, email: anna.email, password: 'password12' },
    { profileId: matteo.id, email: matteo.email, password: 'password12' },
    { profileId: giulia.id, email: giulia.email, password: 'password12' },
    { profileId: leonardo.id, email: leonardo.email, password: 'admin123' },
  ]

  const timeEntries: TimeEntry[] = []
  const addPair = (userId: string, oratoryId: OratoryId, daysBack: number, inH: number, inM: number, outH: number, outM: number) => {
    timeEntries.push({
      id: uid('te'), userId, oratoryId, type: 'entry', timestamp: daysAgo(daysBack, inH, inM),
      latitude: null, longitude: null, gpsAccuracy: null, distanceFromOratory: null,
      metodoTimbratura: 'gps', fiduciaScore: 82, fiduciaStato: 'ok', fiduciaMotivi: ['GPS entro 200 m dall\'oratorio'],
      createdBy: userId, createdAt: daysAgo(daysBack, inH, inM),
    })
    timeEntries.push({
      id: uid('te'), userId, oratoryId, type: 'exit', timestamp: daysAgo(daysBack, outH, outM),
      latitude: null, longitude: null, gpsAccuracy: null, distanceFromOratory: null,
      metodoTimbratura: 'manuale', fiduciaScore: null, fiduciaStato: null, fiduciaMotivi: [],
      createdBy: userId, createdAt: daysAgo(daysBack, outH, outM),
    })
  }
  addPair(marco.id, 'jerago', 0, 8, 2, 13, 34)
  addPair(luca.id, 'jerago', 0, 8, 15, 13, 34)
  addPair(matteo.id, 'besnate', 0, 9, 3, 13, 15)
  addPair(giulia.id, 'besnate', 0, 8, 37, 13, 15)
  for (let i = 1; i <= 4; i++) {
    addPair(marco.id, 'jerago', i, 8, 4 + i, 13, 5 + i * 2)
    addPair(luca.id, 'jerago', i, 8, 10 + i, 12, 30 + i)
  }

  const form1: FormDef = {
    id: uid('form'), title: 'Presenza settimana 2', description: 'Conferma la tua presenza per la settimana 2.',
    createdBy: adminJerago.id, targetType: 'all', targetOratories: [], targetUserIds: [],
    deadline: daysAgo(-1, 23, 59), status: 'open', createdAt: nowIso(),
  }
  const form2: FormDef = {
    id: uid('form'), title: 'Gita oratorio', description: 'Adesione alla gita di fine estate.',
    createdBy: adminJerago.id, targetType: 'oratory', targetOratories: ['jerago'], targetUserIds: [],
    deadline: daysAgo(-4, 23, 59), status: 'open', createdAt: nowIso(),
  }
  const forms = [form1, form2]

  const formQuestions: FormQuestion[] = [
    { id: uid('q'), formId: form1.id, question: 'Sarai presente venerdì?', type: 'yesno', options: [], required: true, sortOrder: 0 },
    { id: uid('q'), formId: form2.id, question: 'Parteciperai alla gita?', type: 'yesno', options: [], required: true, sortOrder: 0 },
    { id: uid('q'), formId: form2.id, question: 'Note (allergie, esigenze particolari)', type: 'text', options: [], required: false, sortOrder: 1 },
  ]

  const formResponses: FormResponse[] = []
  const formAnswers: FormAnswer[] = []

  return {
    profiles, accounts, oratories, timeEntries, forms, formQuestions, formResponses, formAnswers,
    auditLogs: [],
  }
}

function load(): Db {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) {
    const fresh = seed()
    localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh))
    return fresh
  }
  try {
    return JSON.parse(raw) as Db
  } catch {
    const fresh = seed()
    localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh))
    return fresh
  }
}

let cache: Db | null = null

function getDb(): Db {
  if (!cache) cache = load()
  return cache
}

function persist() {
  if (cache) localStorage.setItem(STORAGE_KEY, JSON.stringify(cache))
}

/** Simulates async network latency so loading states are exercised in the UI. */
export function tick<T>(value: T, ms = 220): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms))
}

export const db = {
  get: getDb,
  save: persist,
}

export function resetDemoData(): void {
  cache = seed()
  persist()
}

export function getSessionProfileId(): string | null {
  return localStorage.getItem(SESSION_KEY)
}

export function setSessionProfileId(id: string | null): void {
  if (id) localStorage.setItem(SESSION_KEY, id)
  else localStorage.removeItem(SESSION_KEY)
}
