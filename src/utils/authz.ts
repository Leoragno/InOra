import type { OratoryId, Profile, Role } from '../types'

export class ForbiddenError extends Error {}

export function isAdmin(role: Role): boolean {
  return role === 'admin_jerago' || role === 'admin_besnate' || role === 'admin_general'
}

/** Oratories a given actor is allowed to see/manage admin data for. */
export function scopedOratories(actor: Profile): OratoryId[] {
  switch (actor.role) {
    case 'admin_general':
      return ['jerago', 'besnate']
    case 'admin_jerago':
      return ['jerago']
    case 'admin_besnate':
      return ['besnate']
    default:
      return actor.oratoryId ? [actor.oratoryId] : []
  }
}

export function canManageOratory(actor: Profile, oratoryId: OratoryId): boolean {
  return scopedOratories(actor).includes(oratoryId)
}

/** Mirrors what a Postgres RLS policy would enforce — keep in sync with the SQL in design/DATABASE.sql. */
export function assertCanManageOratory(actor: Profile, oratoryId: OratoryId): void {
  if (!isAdmin(actor.role)) throw new ForbiddenError('Solo gli admin possono gestire questa risorsa.')
  if (!canManageOratory(actor, oratoryId)) {
    throw new ForbiddenError(`Non hai i permessi per gestire l'oratorio di ${oratoryId}.`)
  }
}

export function assertCanManageProfile(actor: Profile, target: Profile): void {
  if (actor.id === target.id) return
  if (!isAdmin(actor.role)) throw new ForbiddenError('Non hai i permessi per questa azione.')
  if (target.oratoryId && !canManageOratory(actor, target.oratoryId)) {
    throw new ForbiddenError("Non hai i permessi su questo oratorio.")
  }
}
