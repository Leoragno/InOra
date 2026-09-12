import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { Spinner } from './Feedback'
import type { ReactNode } from 'react'
import type { Role } from '../types'

export function homePathForRole(role: Role): string {
  return role === 'animatore' ? '/' : '/admin'
}

export function RequireAuth() {
  const { user, loading } = useAuth()
  if (loading) return <Spinner label="Caricamento…" />
  if (!user) return <Navigate to="/login" replace />
  return <Outlet />
}

export function RequireRole({ roles }: { roles: Role[] }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  if (!roles.includes(user.role)) return <Navigate to={homePathForRole(user.role)} replace />
  return <Outlet />
}

export function RedirectIfAuthed({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return <Spinner />
  if (user) return <Navigate to={homePathForRole(user.role)} replace />
  return <>{children}</>
}
