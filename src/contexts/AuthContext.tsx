import { createContext, useCallback, useEffect, useState, type ReactNode } from 'react'
import * as authService from '../services/authService'
import { WelcomeSplash } from '../components/WelcomeSplash'
import type { Profile } from '../types'

interface AuthContextValue {
  user: Profile | null
  loading: boolean
  login: (email: string, password: string) => Promise<Profile>
  register: (input: authService.RegisterInput) => Promise<Profile>
  logout: () => Promise<void>
  refresh: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  // Profilo che ha appena fatto login in questa sessione di navigazione — pilota
  // lo splash di benvenuto. Vive qui (sopra tutte le route) e non su LoginPage,
  // perché RedirectIfAuthed smonta LoginPage nello stesso istante in cui `user`
  // diventa non nullo, prima che uno stato locale lì dentro possa renderizzare.
  const [justLoggedIn, setJustLoggedIn] = useState<Profile | null>(null)

  const refresh = useCallback(async () => {
    const profile = await authService.getSessionUser()
    setUser(profile)
  }, [])

  useEffect(() => {
    refresh().finally(() => setLoading(false))
    return authService.onAuthStateChange(setUser)
  }, [refresh])

  const login = useCallback(async (email: string, password: string) => {
    const profile = await authService.login(email, password)
    setUser(profile)
    setJustLoggedIn(profile)
    return profile
  }, [])

  const register = useCallback(async (input: authService.RegisterInput) => {
    return authService.register(input)
  }, [])

  const logout = useCallback(async () => {
    await authService.logout()
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refresh }}>
      {children}
      {justLoggedIn && (
        <WelcomeSplash firstName={justLoggedIn.firstName} onClose={() => setJustLoggedIn(null)} />
      )}
    </AuthContext.Provider>
  )
}
