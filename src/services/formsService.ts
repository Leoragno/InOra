import { db, tick, uid } from './db'
import { isAdmin, scopedOratories } from '../utils/authz'
import { writeAudit } from './auditService'
import type { FormAnswer, FormDef, FormQuestion, FormResponse, OratoryId, Profile, QuestionType } from '../types'

function isTargeted(form: FormDef, profile: Profile): boolean {
  if (form.targetType === 'all') return true
  if (form.targetType === 'oratory') return !!profile.oratoryId && form.targetOratories.includes(profile.oratoryId)
  return form.targetUserIds.includes(profile.id)
}

export interface FormWithMeta extends FormDef {
  answered: boolean
  questions: FormQuestion[]
}

export async function listFormsForUser(actor: Profile): Promise<FormWithMeta[]> {
  const database = db.get()
  const responded = new Set(database.formResponses.filter((r) => r.userId === actor.id).map((r) => r.formId))
  const rows = database.forms
    .filter((f) => isTargeted(f, actor))
    .map((f) => ({
      ...f,
      answered: responded.has(f.id),
      questions: database.formQuestions.filter((q) => q.formId === f.id).sort((a, b) => a.sortOrder - b.sortOrder),
    }))
  return tick(rows)
}

export async function listFormsForAdmin(actor: Profile): Promise<FormDef[]> {
  if (!isAdmin(actor.role)) return tick([])
  const allowed = new Set(scopedOratories(actor))
  const rows = db.get().forms.filter((f) => {
    if (actor.role === 'admin_general') return true
    if (f.targetType === 'all') return true
    if (f.targetType === 'oratory') return f.targetOratories.some((o) => allowed.has(o))
    return true
  })
  return tick(rows)
}

export interface CreateQuestionInput {
  question: string
  type: QuestionType
  options: string[]
  required: boolean
}

export interface CreateFormInput {
  title: string
  description: string
  targetType: FormDef['targetType']
  targetOratories: OratoryId[]
  targetUserIds: string[]
  deadline: string | null
  questions: CreateQuestionInput[]
}

export async function createForm(actor: Profile, input: CreateFormInput): Promise<FormDef> {
  if (!isAdmin(actor.role)) throw new Error('Solo gli admin possono creare moduli.')
  const database = db.get()
  const form: FormDef = {
    id: uid('form'),
    title: input.title,
    description: input.description,
    createdBy: actor.id,
    targetType: input.targetType,
    targetOratories: input.targetOratories,
    targetUserIds: input.targetUserIds,
    deadline: input.deadline,
    status: 'open',
    createdAt: new Date().toISOString(),
  }
  database.forms.push(form)
  input.questions.forEach((q, i) => {
    database.formQuestions.push({ id: uid('q'), formId: form.id, question: q.question, type: q.type, options: q.options, required: q.required, sortOrder: i })
  })
  db.save()
  writeAudit(actor, 'form.create', 'form', form.id, { title: form.title })
  return tick(form)
}

export async function submitResponse(actor: Profile, formId: string, answers: Record<string, string>): Promise<FormResponse> {
  const database = db.get()
  if (database.formResponses.some((r) => r.formId === formId && r.userId === actor.id)) {
    throw new Error('Hai già inviato questo modulo.')
  }
  const response: FormResponse = { id: uid('resp'), formId, userId: actor.id, submittedAt: new Date().toISOString() }
  database.formResponses.push(response)
  for (const [questionId, answer] of Object.entries(answers)) {
    const record: FormAnswer = { id: uid('ans'), responseId: response.id, questionId, answer }
    database.formAnswers.push(record)
  }
  db.save()
  writeAudit(actor, 'form.response', 'form', formId, { responseId: response.id })
  return tick(response)
}

export interface QuestionResult {
  question: FormQuestion
  counts: Record<string, number>
  textAnswers: string[]
}

export interface FormResults {
  form: FormDef
  eligibleCount: number
  respondedCount: number
  notRespondedCount: number
  questionResults: QuestionResult[]
}

export async function getFormResults(actor: Profile, formId: string): Promise<FormResults> {
  if (!isAdmin(actor.role)) throw new Error('Solo gli admin possono vedere i risultati.')
  const database = db.get()
  const form = database.forms.find((f) => f.id === formId)
  if (!form) throw new Error('Modulo non trovato.')
  const eligible = database.profiles.filter((p) => p.role === 'animatore' && p.status === 'active' && isTargeted(form, p))
  const responses = database.formResponses.filter((r) => r.formId === formId)
  const questions = database.formQuestions.filter((q) => q.formId === formId).sort((a, b) => a.sortOrder - b.sortOrder)
  const answersByResponse = new Map<string, FormAnswer[]>()
  for (const r of responses) answersByResponse.set(r.id, database.formAnswers.filter((a) => a.responseId === r.id))

  const questionResults: QuestionResult[] = questions.map((q) => {
    const counts: Record<string, number> = {}
    const textAnswers: string[] = []
    for (const r of responses) {
      const ans = answersByResponse.get(r.id)?.find((a) => a.questionId === q.id)
      if (!ans) continue
      if (q.type === 'yesno' || q.type === 'choice' || q.type === 'checkbox') {
        counts[ans.answer] = (counts[ans.answer] ?? 0) + 1
      } else {
        textAnswers.push(ans.answer)
      }
    }
    return { question: q, counts, textAnswers }
  })

  return tick({
    form,
    eligibleCount: eligible.length,
    respondedCount: responses.length,
    notRespondedCount: Math.max(0, eligible.length - responses.length),
    questionResults,
  })
}
