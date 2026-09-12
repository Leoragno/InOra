import { supabase } from '../lib/supabaseClient'
import type { AuditAction, AuditLog, Profile } from '../types'

interface AuditLogRow {
  id: string
  user_id: string
  action: AuditAction
  target_type: string
  target_id: string
  metadata: Record<string, unknown>
  created_at: string
}

function mapAuditLog(row: AuditLogRow): AuditLog {
  return {
    id: row.id,
    userId: row.user_id,
    action: row.action,
    targetType: row.target_type,
    targetId: row.target_id,
    metadata: row.metadata,
    createdAt: row.created_at,
  }
}

export async function writeAudit(
  actor: Profile,
  action: AuditAction,
  targetType: string,
  targetId: string,
  metadata: Record<string, unknown> = {},
): Promise<void> {
  const { error } = await supabase.from('audit_logs').insert({
    user_id: actor.id,
    action,
    target_type: targetType,
    target_id: targetId,
    metadata,
  })
  if (error) console.warn('writeAudit fallito:', error.message)
}

export async function listRecentForUsers(userIds: string[], limit = 6): Promise<AuditLog[]> {
  if (!userIds.length) return []
  const { data, error } = await supabase
    .from('audit_logs')
    .select('*')
    .in('user_id', userIds)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return (data as AuditLogRow[]).map(mapAuditLog)
}

export async function listAuditForTarget(targetType: string, targetId: string): Promise<AuditLog[]> {
  const { data, error } = await supabase
    .from('audit_logs')
    .select('*')
    .eq('target_type', targetType)
    .eq('target_id', targetId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data as AuditLogRow[]).map(mapAuditLog)
}
