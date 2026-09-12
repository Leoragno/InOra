import { useEffect, useState } from 'react'

const DOT_COLORS = ['#ef4444', '#2563eb', '#16a34a'] as const

/**
 * Momento di apertura app subito dopo il login — usa lo stemma della
 * Comunità Pastorale JOB (da cui l'app prende il nome) invece di un generico
 * spinner, per farla sentire "la nostra app" fin dal primo istante.
 */
export function WelcomeSplash({ firstName, onClose }: { firstName: string; onClose: () => void }) {
  const [closing, setClosing] = useState(false)

  useEffect(() => {
    const auto = setTimeout(() => setClosing(true), 1800)
    return () => clearTimeout(auto)
  }, [])

  useEffect(() => {
    if (!closing) return
    const t = setTimeout(onClose, 320)
    return () => clearTimeout(t)
  }, [closing, onClose])

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-[#1e3a8a] to-[#3730a3] p-6 ${closing ? 'animate-fade-out' : 'animate-fade-in'}`}
      onClick={() => setClosing(true)}
    >
      <div className={`flex w-full max-w-[300px] flex-col items-center gap-1 text-center ${closing ? 'animate-fade-out' : ''}`}>
        <img
          src="/logo-comunita.png"
          alt="Comunità Pastorale JOB"
          className="h-32 w-32 animate-crown-in rounded-full bg-white object-contain p-3 shadow-[0_20px_50px_rgba(0,0,0,0.35)]"
        />
        <div className="mt-2 flex gap-2.5">
          {DOT_COLORS.map((color, i) => (
            <span
              key={color}
              className="h-2 w-2 animate-dot-pop rounded-full"
              style={{ backgroundColor: color, animationDelay: `${0.55 + i * 0.1}s` }}
            />
          ))}
        </div>
        <div className="mt-3 text-[21px] font-extrabold text-white">Benvenuto/a, {firstName}!</div>
        <div className="text-[13px] font-semibold text-white/75">Comunità Pastorale JOB</div>
      </div>
    </div>
  )
}
