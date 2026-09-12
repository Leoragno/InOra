import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ChevronLeft, CheckCircle2 } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { useToast } from '../../hooks/useToast'
import * as formsService from '../../services/formsService'
import type { FormWithMeta } from '../../services/formsService'
import { Card } from '../../components/Card'
import { Button } from '../../components/Button'
import { Field, TextInput } from '../../components/Field'
import { Spinner } from '../../components/Feedback'
import type { FormQuestion } from '../../types'

export function ModuloCompilaPage() {
  const { formId } = useParams<{ formId: string }>()
  const { user } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()
  const [form, setForm] = useState<FormWithMeta | null | undefined>(undefined)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  useEffect(() => {
    if (!user || !formId) return
    formsService.listFormsForUser(user).then((forms) => {
      const found = forms.find((f) => f.id === formId) ?? null
      setForm(found)
      setSent(!!found?.answered)
    })
  }, [user, formId])

  if (form === undefined) return <Spinner />
  if (!form) {
    return (
      <div className="mx-auto max-w-lg px-5 pt-8 text-center text-sm text-slate-500">Modulo non trovato.</div>
    )
  }

  function setAnswer(q: FormQuestion, value: string) {
    setAnswers((a) => ({ ...a, [q.id]: value }))
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!user || !form) return
    const missing = form.questions.find((q) => q.required && !answers[q.id]?.trim())
    if (missing) {
      toast.error(`Rispondi a "${missing.question}" prima di inviare.`)
      return
    }
    setSending(true)
    try {
      await formsService.submitResponse(user, form.id, answers)
      setSent(true)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Impossibile inviare il modulo.')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-5 px-5 pb-8 pt-5 lg:max-w-xl lg:pt-8">
      <button onClick={() => navigate('/moduli')} className="flex items-center gap-1.5 self-start text-ink-950">
        <ChevronLeft size={20} />
      </button>

      {sent ? (
        <Card className="animate-up flex flex-col items-center gap-2 py-10 text-center">
          <CheckCircle2 size={36} className="text-good-500" />
          <div className="text-lg font-extrabold text-ink-950">Modulo inviato</div>
          <div className="text-[13px] text-slate-500">Grazie, la tua risposta è stata registrata.</div>
          <Button variant="soft" className="mt-2" onClick={() => navigate('/moduli')}>Torna ai moduli</Button>
        </Card>
      ) : (
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div>
            <div className="text-xl font-extrabold text-ink-950">{form.title}</div>
            {form.description && <div className="mt-1 text-[13px] text-slate-500">{form.description}</div>}
          </div>
          {form.questions.map((q) => (
            <Card key={q.id} className="flex flex-col gap-2.5">
              <div className="text-sm font-bold text-ink-950">{q.question}{q.required && <span className="text-bad-500"> *</span>}</div>
              <QuestionInput question={q} value={answers[q.id] ?? ''} onChange={(v) => setAnswer(q, v)} />
            </Card>
          ))}
          <Button type="submit" fullWidth loading={sending}>Invia</Button>
        </form>
      )}
    </div>
  )
}

function QuestionInput({ question, value, onChange }: { question: FormQuestion; value: string; onChange: (v: string) => void }) {
  if (question.type === 'yesno') {
    return (
      <div className="flex gap-2">
        {['Sì', 'No'].map((opt) => (
          <button
            type="button"
            key={opt}
            onClick={() => onChange(opt)}
            className={`flex-1 rounded-xl border px-4 py-2.5 text-[13.5px] font-bold transition-colors ${value === opt ? 'border-brand-600 bg-brand-50 text-brand-600' : 'border-slate-200 text-slate-600 hover:border-brand-300'}`}
          >
            {opt}
          </button>
        ))}
      </div>
    )
  }
  if (question.type === 'choice') {
    return (
      <div className="flex flex-col gap-2">
        {question.options.map((opt) => (
          <button
            type="button"
            key={opt}
            onClick={() => onChange(opt)}
            className={`rounded-xl border px-3.5 py-2.5 text-left text-[13.5px] font-semibold transition-colors ${value === opt ? 'border-brand-600 bg-brand-50 text-brand-600' : 'border-slate-200 text-slate-600 hover:border-brand-300'}`}
          >
            {opt}
          </button>
        ))}
      </div>
    )
  }
  if (question.type === 'checkbox') {
    const selected = value ? value.split('|') : []
    function toggle(opt: string) {
      const next = selected.includes(opt) ? selected.filter((o) => o !== opt) : [...selected, opt]
      onChange(next.join('|'))
    }
    return (
      <div className="flex flex-col gap-2">
        {question.options.map((opt) => (
          <button
            type="button"
            key={opt}
            onClick={() => toggle(opt)}
            className={`flex items-center gap-2.5 rounded-xl border px-3.5 py-2.5 text-left text-[13.5px] font-semibold transition-colors ${selected.includes(opt) ? 'border-brand-600 bg-brand-50 text-brand-600' : 'border-slate-200 text-slate-600'}`}
          >
            <span className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[5px] text-[11px] ${selected.includes(opt) ? 'bg-brand-600 text-white' : 'border-[1.5px] border-slate-300'}`}>
              {selected.includes(opt) && '✓'}
            </span>
            {opt}
          </button>
        ))}
      </div>
    )
  }
  if (question.type === 'date') {
    return <TextInput type="date" value={value} onChange={(e) => onChange(e.target.value)} />
  }
  if (question.type === 'number') {
    return <TextInput type="number" value={value} onChange={(e) => onChange(e.target.value)} />
  }
  return (
    <Field>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={3}
        placeholder="La tua risposta…"
        className="resize-none rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm font-medium text-ink-950 outline-none focus:border-brand-600 focus:bg-white"
      />
    </Field>
  )
}
