import { createContext, useCallback, useEffect, useState, type ReactNode } from 'react'
import * as authService from '../services/authService'
import type { Profile } from '../types'

interface AuthContextValue {
  user: Profile | null
  loading: boolean
  login: (email: string, password: string) => Promise<Profile>
  register: (input: authService.RegisterInput) => Promise<Profile>
  logout: () => void
  refresh: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    const profile = await authService.getSessionUser()
    setUser(profile)
  }, [])

  useEffect(() => {
    refresh().finally(() => setLoading(false))
  }, [refresh])

  const login = useCallback(async (email: string, password: string) => {
    const profile = await authService.login(email, password)
    setUser(profile)
    return profile
  }, [])

  const register = useCallback(async (input: authService.RegisterInput) => {
    return authService.register(input)
  }, [])

  const logout = useCallback(() => {
    authService.logout()
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  )
}
