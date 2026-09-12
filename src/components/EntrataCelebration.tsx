import { useEffect, useState } from 'react'
import { formatTime } from '../lib/format'

const DOT_COLORS = ['#ef4444', '#2563eb', '#16a34a'] as const

/**
 * Momento celebrativo alla prima timbratura di entrata della giornata — usa
 * lo stemma della Comunità Pastorale JOB (da cui l'app prende il nome) invece
 * di un generico segno di spunta, per farla sentire "la nostra app" e non un
 * software qualsiasi.
 */
export function EntrataCelebration({ firstName, time, onClose }: { firstName: string; time: string; onClose: () => void }) {
  const [closing, setClosing] = useState(false)

  useEffect(() => {
    const auto = setTimeout(() => setClosing(true), 2600)
    return () => clearTimeout(auto)
  }, [])

  useEffect(() => {
    if (!closing) return
    const t = setTimeout(onClose, 320)
    return () => clearTimeout(t)
  }, [closing, onClose])

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-ink-950/45 p-6 backdrop-blur-sm ${closing ? 'animate-fade-out' : 'animate-fade-in'}`}
      onClick={() => setClosing(true)}
    >
      <div
        className={`flex w-full max-w-[300px] flex-col items-center gap-1 rounded-[28px] bg-white px-7 pb-7 pt-8 text-center shadow-[0_30px_70px_rgba(15,23,42,0.35)] ${closing ? 'animate-fade-out' : 'animate-pop'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src="/logo-comunita.png"
          alt="Comunità Pastorale JOB"
          className="h-28 w-28 animate-crown-in object-contain"
        />
        <div className="mt-1 flex gap-2.5">
          {DOT_COLORS.map((color, i) => (
            <span
              key={color}
              className="h-2 w-2 animate-dot-pop rounded-full"
              style={{ backgroundColor: color, animationDelay: `${0.55 + i * 0.1}s` }}
            />
          ))}
        </div>
        <div className="mt-3 text-[19px] font-extrabold text-ink-950">Benvenuto/a, {firstName}!</div>
        <div className="text-[13px] font-semibold text-slate-500">Entrata registrata alle {formatTime(time)}</div>
      </div>
    </div>
  )
}
