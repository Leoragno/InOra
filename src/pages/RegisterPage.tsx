import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { CheckCircle2, ChevronLeft } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { AuthError } from '../services/authService'
import { Button } from '../components/Button'
import { Field, TextInput, SelectInput } from '../components/Field'
import { ErrorBanner } from '../components/Feedback'
import type { OratoryId } from '../types'

const CURRENT_YEAR = new Date().getFullYear()
const BIRTH_YEARS = Array.from({ length: 15 }, (_, i) => CURRENT_YEAR - 12 - i)

const ORATORI: { id: OratoryId; nome: string; desc: string }[] = [
  { id: 'jerago', nome: 'Jerago', desc: 'Oratorio di Jerago' },
  { id: 'besnate', nome: 'Besnate', desc: 'Oratorio di Besnate' },
]

type Step = 1 | 2 | 3

export function RegisterPage() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [step, setStep] = useState<Step>(1)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [birthYear, setBirthYear] = useState(BIRTH_YEARS[5])
  const [oratoryId, setOratoryId] = useState<OratoryId>('jerago')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  function onStep1(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setStep(2)
  }

  async function onStep2(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (password.length < 8) return setError('La password deve avere almeno 8 caratteri.')
    if (password !== confirmPassword) return setError('Le password non coincidono.')
    setLoading(true)
    try {
      await register({ firstName, lastName, birthYear, oratoryId, email, password })
      setStep(3)
    } catch (err) {
      setError(err instanceof AuthError ? err.message : 'Si è verificato un errore. Riprova.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm overflow-hidden rounded-[32px] bg-white shadow-[0_30px_70px_rgba(15,23,42,0.22)]">
        {step === 1 && (
          <form onSubmit={onStep1} className="flex flex-col gap-5 px-7 py-8">
            <Wizard step={1} onBack={() => navigate('/login')} />
            <div>
              <div className="text-2xl font-extrabold text-ink-950">Crea il tuo account</div>
              <div className="mt-1 text-[13.5px] text-slate-500">Prima raccontaci qualcosa di te.</div>
            </div>
            <Field label="Nome">
              <TextInput required value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Nome" />
            </Field>
            <Field label="Cognome">
              <TextInput required value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Cognome" />
            </Field>
            <Field label="Anno di nascita">
              <SelectInput value={birthYear} onChange={(e) => setBirthYear(Number(e.target.value))}>
                {BIRTH_YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
              </SelectInput>
            </Field>
            <div className="mt-2">
              <Button type="submit" fullWidth>Continua</Button>
            </div>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={onStep2} className="flex flex-col gap-5 px-7 py-8">
            <Wizard step={2} onBack={() => setStep(1)} />
            <div>
              <div className="text-2xl font-extrabold text-ink-950">Dove fai l'animatore?</div>
              <div className="mt-1 text-[13.5px] text-slate-500">Scegli il tuo oratorio e completa la registrazione.</div>
            </div>
            <div className="flex flex-col gap-2.5">
              {ORATORI.map((o) => {
                const selected = oratoryId === o.id
                return (
                  <button
                    type="button"
                    key={o.id}
                    onClick={() => setOratoryId(o.id)}
                    className={`flex items-center gap-3 rounded-2xl border p-3.5 text-left transition-colors ${selected ? 'border-2 border-brand-600 bg-brand-50' : 'border-slate-200 bg-white hover:border-brand-300'}`}
                  >
                    <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${o.id === 'jerago' ? 'bg-bad-50 text-bad-600' : 'bg-good-50 text-good-700'}`}>
                      <Building size={20} />
                    </span>
                    <span className="flex-1">
                      <span className="block text-[15px] font-bold text-ink-950">{o.nome}</span>
                      <span className="block text-xs text-slate-500">{o.desc}</span>
                    </span>
                    {selected ? (
                      <span className="flex h-[22px] w-[22px] items-center justify-center rounded-full bg-brand-600 text-[11px] text-white"><CheckCircle2 size={14} /></span>
                    ) : (
                      <span className="h-[22px] w-[22px] rounded-full border-[1.5px] border-slate-300" />
                    )}
                  </button>
                )
              })}
            </div>
            {error && <ErrorBanner message={error} />}
            <Field label="Email">
              <TextInput type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nome@email.it" />
            </Field>
            <Field label="Password">
              <TextInput type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Almeno 8 caratteri" />
            </Field>
            <Field label="Conferma password">
              <TextInput type="password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Ripeti la password" />
            </Field>
            <Button type="submit" fullWidth loading={loading}>Crea account</Button>
          </form>
        )}

        {step === 3 && (
          <div className="flex flex-col items-center gap-4 px-8 py-12 text-center">
            <div className="relative flex h-[74px] w-[74px] items-center justify-center">
              <span className="absolute inset-0 animate-ring rounded-full bg-good-500" />
              <span className="relative flex h-[74px] w-[74px] items-center justify-center rounded-full bg-good-500 text-white shadow-[0_12px_26px_rgba(16,185,129,0.32)]">
                <CheckCircle2 size={34} />
              </span>
            </div>
            <div className="animate-up text-[22px] font-extrabold text-ink-950">Richiesta inviata!</div>
            <div className="animate-up text-[13.5px] leading-relaxed text-slate-500">
              Il tuo account è in attesa di approvazione da parte dell'admin del tuo oratorio. Ti avviseremo quando sarà possibile accedere.
            </div>
            <Link to="/login" className="animate-up mt-1">
              <Button variant="soft">Torna al login</Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}

function Wizard({ step, onBack }: { step: 1 | 2; onBack: () => void }) {
  return (
    <div className="flex items-center gap-3.5">
      <button type="button" onClick={onBack} className="p-0 text-ink-950">
        <ChevronLeft size={22} />
      </button>
      <div className="h-[5px] flex-1 overflow-hidden rounded-full bg-slate-200">
        <div className="h-full rounded-full bg-brand-600 transition-all" style={{ width: step === 1 ? '50%' : '100%' }} />
      </div>
      <div className="text-xs font-bold text-slate-400">{step} / 2</div>
    </div>
  )
}

function Building({ size }: { size: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor">
      <path d="M11 2h2v3h3v2h-3v3l6 4v10h-7v-5h-2v5H3V14l6-4V7H6V5h3z" />
    </svg>
  )
}
