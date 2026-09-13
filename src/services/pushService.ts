// Notifiche push — porting di subscribeUserToPush/savePushSubscription dalla
// vecchia app. Il server-side (Edge Function "send-push", con VAPID_PRIVATE_KEY
// e service role key già configurati come secret su questo progetto Supabase)
// è stato riusato quasi identico, solo il targeting "per anno" è diventato
// "per oratorio".
import { supabase } from '../lib/supabaseClient'
import type { OratoryId } from '../types'

// Chiave pubblica VAPID — non è un segreto, è pensata per essere distribuita al client.
const VAPID_PUBLIC_KEY = 'BNjv6Z8q4i2w3U7exY3BuEcAOjt67PR9YAy-PsrUKj67gQ-a-CjwmG_CK91fBYeGHuIMkjRAWx0sfjXKt6mJN3M'

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  const output = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; i++) output[i] = rawData.charCodeAt(i)
  return output
}

export function isPushSupported(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
}

export async function getPushSubscription(): Promise<PushSubscription | null> {
  if (!isPushSupported()) return null
  const registration = await navigator.serviceWorker.ready
  return registration.pushManager.getSubscription()
}

export class PushPermissionError extends Error {}

export async function subscribeToPush(userId: string): Promise<void> {
  if (!isPushSupported()) throw new PushPermissionError('Le notifiche push non sono supportate su questo dispositivo/browser.')
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') throw new PushPermissionError('Permesso notifiche negato.')

  const registration = await navigator.serviceWorker.ready
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
  })

  const { error } = await supabase
    .from('push_subscriptions')
    .upsert({ user_id: userId, subscription_json: subscription.toJSON() })
  if (error) throw error
}

export async function unsubscribeFromPush(): Promise<void> {
  const subscription = await getPushSubscription()
  if (!subscription) return
  const endpoint = subscription.endpoint
  await subscription.unsubscribe()
  await supabase.from('push_subscriptions').delete().eq('subscription_json->>endpoint', endpoint)
}

export interface BroadcastInput {
  title: string
  body: string
  url?: string
  target: { type: 'all' } | { type: 'oratory'; oratoryId: OratoryId } | { type: 'single'; userId: string }
}

export interface BroadcastResult {
  success: boolean
  sent: number
  failed?: number
  total?: number
  reason?: string
}

export async function sendBroadcast(input: BroadcastInput): Promise<BroadcastResult> {
  const target_type = input.target.type
  const target_value = input.target.type === 'oratory' ? input.target.oratoryId : input.target.type === 'single' ? input.target.userId : undefined
  const { data, error } = await supabase.functions.invoke('send-push', {
    body: { title: input.title, body: input.body, url: input.url, target_type, target_value },
  })
  if (error) throw error
  return data as BroadcastResult
}
