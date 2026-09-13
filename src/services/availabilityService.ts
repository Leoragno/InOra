// Porting di "Disponibilità" dalla vecchia app (caricaDisponibilita,
// salvaSettimana, loadSettimane/loadDispRiepilogo lato admin).
import { supabase } from '../lib/supabaseClient'
import { assertCanManageOratory } from '../utils/authz'
import type { AvailabilityResponse, AvailabilityStatus, AvailabilityWeek, OratoryId, Profile } from '../types'

interface WeekRow {
  id: string
  oratory_id: OratoryId
  name: string
  date_info: string
  active_days: number[]
  closed: boolean
  sort_order: number
  created_at: string
}

interface ResponseRow {
  id: string
  week_id: string
  user_id: string
  day_index: number
  status: AvailabilityStatus | null
  note: string
  updated_at: string
}

function mapWeek(row: WeekRow): AvailabilityWeek {
  return {
    id: row.id,
    oratoryId: row.oratory_id,
    name: row.name,
    dateInfo: row.date_info,
    activeDays: row.active_days,
    closed: row.closed,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
  }
}

function mapResponse(row: ResponseRow): AvailabilityResponse {
  return {
    id: row.id,
    weekId: row.week_id,
    userId: row.user_id,
    dayIndex: row.day_index,
    status: row.status,
    note: row.note,
    updatedAt: row.updated_at,
  }
}

export async function listWeeksForOratory(oratoryId: OratoryId): Promise<AvailabilityWeek[]> {
  const { data, error } = await supabase
    .from('availability_weeks')
    .select('*')
    .eq('oratory_id', oratoryId)
    .order('sort_order')
    .order('created_at')
  if (error) throw error
  return (data as WeekRow[]).map(mapWeek)
}

export async function listWeeksForOratories(oratoryIds: OratoryId[]): Promise<AvailabilityWeek[]> {
  if (!oratoryIds.length) return []
  const { data, error } = await supabase
    .from('availability_weeks')
    .select('*')
    .in('oratory_id', oratoryIds)
    .order('sort_order')
    .order('created_at')
  if (error) throw error
  return (data as WeekRow[]).map(mapWeek)
}

export async function listMyResponses(userId: string, weekIds: string[]): Promise<AvailabilityResponse[]> {
  if (!weekIds.length) return []
  const { data, error } = await supabase
    .from('availability_responses')
    .select('*')
    .eq('user_id', userId)
    .in('week_id', weekIds)
  if (error) throw error
  return (data as ResponseRow[]).map(mapResponse)
}

export async function listResponsesForWeeks(weekIds: string[]): Promise<AvailabilityResponse[]> {
  if (!weekIds.length) return []
  const { data, error } = await supabase
    .from('availability_responses')
    .select('*')
    .in('week_id', weekIds)
  if (error) throw error
  return (data as ResponseRow[]).map(mapResponse)
}

/** Upsert della risposta di un giorno — l'animatore aggiorna sé stesso, un giorno alla volta. */
export async function saveResponse(
  userId: string,
  weekId: string,
  dayIndex: number,
  status: AvailabilityStatus | null,
  note: string,
): Promise<void> {
  const { error } = await supabase
    .from('availability_responses')
    .upsert(
      { week_id: weekId, user_id: userId, day_index: dayIndex, status, note },
      { onConflict: 'week_id,user_id,day_index' },
    )
  if (error) throw error
}

export interface WeekInput {
  name: string
  dateInfo: string
  activeDays: number[]
}

export async function createWeek(actor: Profile, oratoryId: OratoryId, input: WeekInput): Promise<AvailabilityWeek> {
  assertCanManageOratory(actor, oratoryId)
  const { data, error } = await supabase
    .from('availability_weeks')
    .insert({ oratory_id: oratoryId, name: input.name, date_info: input.dateInfo, active_days: input.activeDays })
    .select()
    .single()
  if (error) throw error
  return mapWeek(data as WeekRow)
}

export async function updateWeek(actor: Profile, week: AvailabilityWeek, input: WeekInput): Promise<AvailabilityWeek> {
  assertCanManageOratory(actor, week.oratoryId)
  const { data, error } = await supabase
    .from('availability_weeks')
    .update({ name: input.name, date_info: input.dateInfo, active_days: input.activeDays })
    .eq('id', week.id)
    .select()
    .single()
  if (error) throw error
  return mapWeek(data as WeekRow)
}

export async function toggleWeekClosed(actor: Profile, week: AvailabilityWeek): Promise<AvailabilityWeek> {
  assertCanManageOratory(actor, week.oratoryId)
  const { data, error } = await supabase
    .from('availability_weeks')
    .update({ closed: !week.closed })
    .eq('id', week.id)
    .select()
    .single()
  if (error) throw error
  return mapWeek(data as WeekRow)
}

export async function deleteWeek(actor: Profile, week: AvailabilityWeek): Promise<void> {
  assertCanManageOratory(actor, week.oratoryId)
  const { error } = await supabase.from('availability_weeks').delete().eq('id', week.id)
  if (error) throw error
}
