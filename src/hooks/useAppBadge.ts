import { useEffect } from 'react'

/** Porting di updateAppBadge() dalla vecchia app (Badging API). */
export function useAppBadge(count: number): void {
  useEffect(() => {
    if (!('setAppBadge' in navigator)) return
    if (count > 0) navigator.setAppBadge(count).catch(() => {})
    else navigator.clearAppBadge?.().catch(() => {})
  }, [count])
}
