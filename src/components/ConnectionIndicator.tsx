import { useEffect, useState } from 'react'
import { useToast } from '../hooks/useToast'

/** Porting di initConnectionIndicator/updateConnectionStatus dalla vecchia app. */
export function ConnectionIndicator() {
  const toast = useToast()
  const [status, setStatus] = useState<'online' | 'offline'>(() => (navigator.onLine ? 'online' : 'offline'))
  const [visible, setVisible] = useState(() => !navigator.onLine)

  useEffect(() => {
    function goOnline() {
      setStatus('online')
      setVisible(true)
      toast.success('Connessione ripristinata')
      setTimeout(() => setVisible(false), 3000)
    }
    function goOffline() {
      setStatus('offline')
      setVisible(true)
      toast.error("Sei offline. Alcune azioni non funzioneranno finché non torni online.")
    }
    window.addEventListener('online', goOnline)
    window.addEventListener('offline', goOffline)
    return () => {
      window.removeEventListener('online', goOnline)
      window.removeEventListener('offline', goOffline)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!visible) return null

  return (
    <div
      className={`fixed left-1/2 top-3 z-40 -translate-x-1/2 whitespace-nowrap rounded-full border px-3.5 py-1.5 text-[11.5px] font-bold shadow-[0_6px_16px_rgba(15,23,42,0.12)] transition-opacity animate-up ${
        status === 'online' ? 'border-good-100 bg-good-50 text-good-700' : 'border-bad-100 bg-bad-50 text-bad-600'
      }`}
    >
      {status === 'online' ? '🟢 Connesso' : '🔴 Offline'}
    </div>
  )
}
