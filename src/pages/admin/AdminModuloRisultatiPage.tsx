import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import * as formsService from '../../services/formsService'
import type { FormResults } from '../../services/formsService'
import { Card } from '../../components/Card'
import { Spinner } from '../../components/Feedback'

export function AdminModuloRisultatiPage() {
  const { formId } = useParams<{ formId: string }>()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [results, setResults] = useState<FormResults | null>(null)

  useEffect(() => {
    if (!user || !formId) return
    formsService.getFormResults(user, formId).then(setResults)
  }, [user, formId])

  if (!results) return <Spinner />

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-5 px-5 py-5 lg:px-8 lg:py-7">
      <button onClick={() => navigate('/admin/moduli')} className="flex items-center gap-1.5 self-start text-sm font-semibold text-slate-500">
        <ChevronLeft size={18} /> Moduli
      </button>

      <div>
        <div className="text-[20px] font-extrabold text-ink-950">{results.form.title}</div>
        <div className="mt-1 text-[13px] font-semibold text-slate-500">
          {results.respondedCount} / {results.eligibleCount} risposte · {results.notRespondedCount} non compilati
        </div>
      </div>

      {results.questionResults.map((qr) => (
        <Card key={qr.question.id} className="flex flex-col gap-3">
          <div className="text-sm font-bold text-ink-950">{qr.question.question}</div>
          {Object.keys(qr.counts).length > 0 ? (
            <div className="flex flex-col gap-2">
              {Object.entries(qr.counts).map(([answer, count]) => {
                const pct = results.respondedCount ? Math.round((count / results.respondedCount) * 100) : 0
                return (
                  <div key={answer}>
                    <div className="flex justify-between text-xs font-semibold text-slate-500">
                      <span>{answer}</span><span>{count}</span>
                    </div>
                    <div className="mt-1 h-[7px] overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full rounded-full bg-brand-600" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          ) : qr.textAnswers.length > 0 ? (
            <div className="flex flex-col gap-1.5">
              {qr.textAnswers.map((a, i) => (
                <div key={i} className="rounded-lg bg-slate-50 px-3 py-2 text-[12.5px] text-slate-600">{a}</div>
              ))}
            </div>
          ) : (
            <div className="text-[12.5px] text-slate-400">Nessuna risposta ancora.</div>
          )}
        </Card>
      ))}
    </div>
  )
}
