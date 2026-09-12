import { db, uid } from './db'
import type { AuditAction, AuditLog, Profile } from '../types'

export function writeAudit(
  actor: Profile,
  action: AuditAction,
  targetType: string,
  targetId: string,
  metadata: Record<string, unknown> = {},
): void {
  const database = db.get()
  const entry: AuditLog = {
    id: uid('audit'),
    userId: actor.id,
    action,
    targetType,
    targetId,
    metadata,
    createdAt: new Date().toISOString(),
  }
  database.auditLogs.push(entry)
  db.save()
}

export function listAuditForTarget(targetType: string, targetId: string): AuditLog[] {
  return db.get().auditLogs.filter((a) => a.targetType === targetType && a.targetId === targetId)
}
