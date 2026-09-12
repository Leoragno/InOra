import { db, getSessionProfileId, setSessionProfileId, tick, uid } from './db'
import type { OratoryId, Profile } from '../types'

export class AuthError extends Error {}

export interface RegisterInput {
  firstName: string
  lastName: string
  birthYear: number
  oratoryId: OratoryId
  email: string
  password: string
}

/** Un solo punto di accesso: il backend determina il ruolo, l'utente non lo sceglie mai. */
export async function login(email: string, password: string): Promise<Profile> {
  const { profiles, accounts } = db.get()
  const normalized = email.trim().toLowerCase()
  const account = accounts.find((a) => a.email.toLowerCase() === normalized)
  if (!account || account.password !== password) {
    await tick(null)
    throw new AuthError('Email o password non corretti.')
  }
  const profile = profiles.find((p) => p.id === account.profileId)
  if (!profile) throw new AuthError('Account non trovato.')
  if (profile.status === 'pending') throw new AuthError('Il tuo account è in attesa di approvazione da parte dell\'admin del tuo oratorio.')
  if (profile.status === 'rejected') throw new AuthError('La tua richiesta di iscrizione è stata rifiutata.')
  if (profile.status === 'disabled') throw new AuthError('Il tuo account è stato disattivato. Contatta un admin.')
  setSessionProfileId(profile.id)
  return tick(profile)
}

export async function register(input: RegisterInput): Promise<Profile> {
  const database = db.get()
  const normalized = input.email.trim().toLowerCase()
  if (database.accounts.some((a) => a.email.toLowerCase() === normalized)) {
    await tick(null)
    throw new AuthError('Esiste già un account con questa email.')
  }
  const now = new Date().toISOString()
  const profile: Profile = {
    id: uid('user'),
    firstName: input.firstName.trim(),
    lastName: input.lastName.trim(),
    birthYear: input.birthYear,
    email: input.email.trim(),
    role: 'animatore',
    oratoryId: input.oratoryId,
    status: 'pending',
    avatarUrl: null,
    createdAt: now,
    updatedAt: now,
  }
  database.profiles.push(profile)
  database.accounts.push({ profileId: profile.id, email: profile.email, password: input.password })
  db.save()
  return tick(profile)
}

export async function getSessionUser(): Promise<Profile | null> {
  const id = getSessionProfileId()
  if (!id) return null
  const profile = db.get().profiles.find((p) => p.id === id) ?? null
  return tick(profile)
}

export function logout(): void {
  setSessionProfileId(null)
}
