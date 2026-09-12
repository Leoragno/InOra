import { supabase } from '../lib/supabaseClient'
import { mapProfile } from './profilesService'
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

function statusMessage(status: Profile['status']): string | null {
  if (status === 'pending') return "Il tuo account è in attesa di approvazione da parte dell'admin del tuo oratorio."
  if (status === 'rejected') return 'La tua richiesta di iscrizione è stata rifiutata.'
  if (status === 'disabled') return 'Il tuo account è stato disattivato. Contatta un admin.'
  return null
}

async function fetchProfile(userId: string) {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single()
  if (error || !data) return null
  return mapProfile(data)
}

/** Un solo punto di accesso: il backend determina il ruolo, l'utente non lo sceglie mai. */
export async function login(email: string, password: string): Promise<Profile> {
  const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
  if (error || !data.user) throw new AuthError('Email o password non corretti.')

  const profile = await fetchProfile(data.user.id)
  if (!profile) {
    await supabase.auth.signOut()
    throw new AuthError('Account non trovato.')
  }
  const blocked = statusMessage(profile.status)
  if (blocked) {
    await supabase.auth.signOut()
    throw new AuthError(blocked)
  }
  return profile
}

export async function register(input: RegisterInput): Promise<Profile> {
  const email = input.email.trim()
  const { data, error } = await supabase.auth.signUp({
    email,
    password: input.password,
    options: {
      data: {
        first_name: input.firstName.trim(),
        last_name: input.lastName.trim(),
        birth_year: input.birthYear,
        oratory_id: input.oratoryId,
      },
    },
  })
  if (error) {
    const msg = error.message.toLowerCase()
    if (msg.includes('already registered') || msg.includes('already exists') || msg.includes('user already')) {
      throw new AuthError('Esiste già un account con questa email.')
    }
    throw new AuthError(error.message)
  }
  if (!data.user) throw new AuthError('Registrazione non riuscita.')

  // Se il progetto richiede conferma email, non c'è ancora una sessione per
  // rileggere il profilo appena creato dal trigger: si restituisce un
  // profilo "virtuale" coerente, la riga vera esiste già lato database.
  const virtualProfile: Profile = {
    id: data.user.id,
    firstName: input.firstName.trim(),
    lastName: input.lastName.trim(),
    birthYear: input.birthYear,
    email,
    role: 'animatore',
    oratoryId: input.oratoryId,
    status: 'pending',
    avatarUrl: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
  if (!data.session) return virtualProfile

  // La richiesta va approvata da un admin: non si resta loggati dopo la registrazione.
  const profile = await fetchProfile(data.user.id)
  await supabase.auth.signOut()
  return profile ?? virtualProfile
}

export async function getSessionUser(): Promise<Profile | null> {
  const { data } = await supabase.auth.getSession()
  const userId = data.session?.user.id
  if (!userId) return null
  return fetchProfile(userId)
}

export async function logout(): Promise<void> {
  await supabase.auth.signOut()
}

/** Notifica ad ogni cambio di sessione (login altrove, refresh token, logout in un'altra scheda). */
export function onAuthStateChange(callback: (profile: Profile | null) => void): () => void {
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    if (!session) {
      callback(null)
      return
    }
    fetchProfile(session.user.id).then(callback)
  })
  return () => data.subscription.unsubscribe()
}
