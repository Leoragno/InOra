import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, Trash2 } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { useToast } from '../../hooks/useToast'
import * as formsService from '../../services/formsService'
import * as profilesService from '../../services/profilesService'
import { scopedOratories } from '../../utils/authz'
import { Card } from '../../components/Card'
import { Button } from '../../components/Button'
import { Field, SelectInput, TextInput } from '../../components/Field'
import type { CreateQuestionInput } from '../../services/formsService'
import type { FormDef, OratoryId, Profile, QuestionType } from '../../types'

const QUESTION_TYPE_LABEL: Record<QuestionType, string> = {
  yesno: 'Sì / No', text: 'Testo', number: 'Numero', date: 'Data', choice: 'Scelta multipla', checkbox: 'Checkbox',
}

let qid = 0
interface DraftQuestion extends CreateQuestionInput { key: number }

export function AdminModuloNuovoPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [questions, setQuestions] = useState<DraftQuestion[]>([{ key: qid++, question: '', type: 'yesno', options: [], required: true }])
  const [targetType, setTargetType] = useState<FormDef['targetType']>('all')
  const [targetOratories, setTargetOratories] = useState<OratoryId[]>([])
  const [targetUserIds, setTargetUserIds] = useState<string[]>([])
  const [deadline, setDeadline] = useState('')
  const [animatori, setAnimatori] = useState<Profile[]>([])
  const [saving, setSaving] = useState(false)

  const allowedOratories = user ? scopedOratories(user) : []

  useEffect(() => {
    if (!user) return
    profilesService.listAnimatori(user).then((rows) => setAnimatori(rows.filter((r) => r.status === 'active')))
  }, [user])

  function addQuestion() {
    setQuestions((qs) => [...qs, { key: qid++, question: '', type: 'yesno', options: [], required: true }])
  }
  function updateQuestion(key: number, patch: Partial<DraftQuestion>) {
    setQuestions((qs) => qs.map((q) => (q.key === key ? { ...q, ...patch } : q)))
  }
  function removeQuestion(key: number) {
    setQuestions((qs) => qs.filter((q) => q.key !== key))
  }

  async function onPublish() {
    if (!user) return
    if (!title.trim()) return toast.error('Inserisci un titolo per il modulo.')
    if (questions.some((q) => !q.question.trim())) return toast.error('Completa il testo di ogni domanda.')
    setSaving(true)
    try {
      await formsService.createForm(user, {
        title: title.trim(),
        description: description.trim(),
        targetType,
        targetOratories: targetType === 'oratory' ? targetOratories : [],
        targetUserIds: targetType === 'specific' ? targetUserIds : [],
        deadline: deadline ? new Date(`${deadline}T23:59:59`).toISOString() : null,
        questions: questions.map(({ key: _key, ...q }) => q),
      })
      toast.success('Modulo pubblicato')
      navigate('/admin/moduli')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Errore')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-5 px-5 py-5 lg:px-8 lg:py-7">
      <button onClick={() => navigate('/admin/moduli')} className="flex items-center gap-1.5 self-start text-sm font-semibold text-slate-500">
        <ChevronLeft size={18} /> Moduli
      </button>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.6fr_1fr] lg:items-start">
        <Card className="flex flex-col gap-4">
          <div className="text-base font-extrabold text-ink-950">Nuovo modulo</div>
          <Field label="Titolo"><TextInput value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Es. Presenza settimana 3" /></Field>
          <Field label="Descrizione"><TextInput value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Facoltativa" /></Field>

          <div>
            <div className="mb-2 text-[12.5px] font-semibold text-slate-600">Domande</div>
            <div className="flex flex-col gap-2.5">
              {questions.map((q) => (
                <div key={q.key} className="flex flex-col gap-2.5 rounded-[13px] border border-slate-200 p-3.5">
                  <div className="flex gap-2">
                    <TextInput className="flex-1" value={q.question} onChange={(e) => updateQuestion(q.key, { question: e.target.value })} placeholder="Testo della domanda" />
                    <button onClick={() => removeQuestion(q.key)} className="shrink-0 rounded-lg px-2 text-slate-400 hover:text-bad-500"><Trash2 size={16} /></button>
                  </div>
                  <div className="flex flex-wrap items-center gap-2.5">
                    <SelectInput className="!w-auto" value={q.type} onChange={(e) => updateQuestion(q.key, { type: e.target.value as QuestionType })}>
                      {Object.entries(QUESTION_TYPE_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </SelectInput>
                    <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                      <input type="checkbox" checked={q.required} onChange={(e) => updateQuestion(q.key, { required: e.target.checked })} />
                      Obbligatoria
                    </label>
                  </div>
                  {(q.type === 'choice' || q.type === 'checkbox') && (
                    <TextInput
                      value={q.options.join(', ')}
                      onChange={(e) => updateQuestion(q.key, { options: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })}
                      placeholder="Opzioni separate da virgola"
                    />
                  )}
                </div>
              ))}
            </div>
            <button onClick={addQuestion} className="mt-2.5 w-full rounded-[11px] border border-dashed border-brand-400 bg-[#f8faff] py-2.5 text-[13px] font-bold text-brand-600 hover:bg-brand-50">
              + Aggiungi domanda
            </button>
          </div>
        </Card>

        <Card className="flex flex-col gap-3.5">
          <div className="text-[15px] font-extrabold text-ink-950">Invia a</div>
          <div className="flex flex-col gap-2">
            <TargetOption label="Tutti" active={targetType === 'all'} onClick={() => setTargetType('all')} />
            <TargetOption label="Oratorio specifico" active={targetType === 'oratory'} onClick={() => setTargetType('oratory')} />
            <TargetOption label="Animatori specifici" active={targetType === 'specific'} onClick={() => setTargetType('specific')} />
          </div>

          {targetType === 'oratory' && (
            <div className="flex gap-2">
              {allowedOratories.map((o) => (
                <button
                  key={o}
                  onClick={() => setTargetOratories((cur) => (cur.includes(o) ? cur.filter((x) => x !== o) : [...cur, o]))}
                  className={`flex-1 rounded-lg border px-3 py-2 text-xs font-bold ${targetOratories.includes(o) ? 'border-brand-600 bg-brand-50 text-brand-600' : 'border-slate-200 text-slate-500'}`}
                >
                  {o === 'jerago' ? 'Jerago' : 'Besnate'}
                </button>
              ))}
            </div>
          )}

          {targetType === 'specific' && (
            <div className="flex max-h-48 flex-col gap-1.5 overflow-y-auto">
              {animatori.map((a) => (
                <label key={a.id} className="flex items-center gap-2 text-[13px] font-medium text-slate-600">
                  <input
                    type="checkbox"
                    checked={targetUserIds.includes(a.id)}
                    onChange={() => setTargetUserIds((cur) => (cur.includes(a.id) ? cur.filter((x) => x !== a.id) : [...cur, a.id]))}
                  />
                  {a.firstName} {a.lastName}
                </label>
              ))}
            </div>
          )}

          <Field label="Scadenza"><TextInput type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} /></Field>
          <div className="flex-1" />
          <Button onClick={onPublish} loading={saving} fullWidth>Pubblica modulo</Button>
        </Card>
      </div>
    </div>
  )
}

function TargetOption({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2.5 rounded-[11px] border px-3 py-2.5 text-left text-[13.5px] font-bold transition-colors ${active ? 'border-[1.5px] border-brand-600 bg-brand-50 text-ink-950' : 'border-slate-200 text-slate-600'}`}
    >
      <span className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[5px] text-[11px] ${active ? 'bg-brand-600 text-white' : 'border-[1.5px] border-slate-300'}`}>{active && '✓'}</span>
      {label}
    </button>
  )
}
