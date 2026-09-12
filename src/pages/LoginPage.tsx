import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { AuthError } from '../services/authService'
import { Button } from '../components/Button'
import { Field, TextInput } from '../components/Field'
import { ErrorBanner } from '../components/Feedback'
import { homePathForRole } from '../components/guards'

export function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const profile = await login(email, password)
      navigate(homePathForRole(profile.role), { replace: true })
    } catch (err) {
      setError(err instanceof AuthError ? err.message : 'Si è verificato un errore. Riprova.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm overflow-hidden rounded-[32px] bg-white shadow-[0_30px_70px_rgba(15,23,42,0.22)]">
        <div className="flex flex-col items-center gap-2 bg-gradient-to-br from-[#1e3a8a] to-[#3730a3] px-8 py-12 text-center text-white">
          <div className="animate-pop text-5xl font-extrabold tracking-tight">JOB</div>
          <div className="animate-up text-[11.5px] font-semibold uppercase tracking-[0.18em] opacity-85">
            Oratori · Presenze · Animatori
          </div>
        </div>
        <form onSubmit={onSubmit} className="flex flex-col gap-4 px-7 py-8">
          <div>
            <div className="text-xl font-extrabold text-ink-950">Benvenuto</div>
            <div className="mt-1 text-[13px] text-slate-500">Accedi al tuo account per continuare</div>
          </div>
          {error && <ErrorBanner message={error} />}
          <Field label="Email">
            <TextInput type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nome@email.it" />
          </Field>
          <Field label="Password">
            <TextInput type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
          </Field>
          <Button type="submit" fullWidth loading={loading}>Accedi</Button>
          <p className="text-center text-[12.5px] text-slate-500">
            Non hai un account? <Link to="/registrati" className="font-bold text-brand-600">Registrati</Link>
          </p>
        </form>
      </div>
    </div>
  )
}
