import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import * as formsService from '../../services/formsService'
import type { FormWithMeta } from '../../services/formsService'
import { Card } from '../../components/Card'
import { Button } from '../../components/Button'
import { EmptyState, Spinner } from '../../components/Feedback'
import { formatFullDate } from '../../lib/format'

export function ModuliPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [forms, setForms] = useState<FormWithMeta[] | null>(null)

  useEffect(() => {
    if (!user) return
    formsService.listFormsForUser(user).then(setForms)
  }, [user])

  const daCompilare = forms?.filter((f) => !f.answered).length ?? 0

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-4 px-5 pb-6 pt-5 lg:max-w-2xl lg:px-8 lg:pt-8">
      <div className="text-[22px] font-extrabold text-ink-950">Moduli</div>
      {forms && forms.length > 0 && (
        <div>
          <span className="inline-block rounded-full bg-brand-50 px-3 py-1.5 text-xs font-bold text-brand-600">
            {daCompilare} da compilare
          </span>
        </div>
      )}

      {!forms ? (
        <Spinner />
      ) : forms.length === 0 ? (
        <EmptyState title="Nessun modulo al momento" subtitle="Quando un admin pubblicherà un modulo, lo troverai qui." />
      ) : (
        <div className="flex flex-col gap-3">
          {forms.map((f) => (
            <Card key={f.id} className="animate-up flex flex-col gap-2.5">
              <div className="flex items-start gap-2.5">
                <span className="h-[34px] w-[34px] shrink-0 rounded-[10px] bg-brand-50" />
                <div className="flex-1">
                  <div className="text-[15px] font-bold text-ink-950">{f.title}</div>
                  {f.deadline && (
                    <div className="mt-0.5 text-xs font-semibold text-bad-500">
                      Scade {formatFullDate(f.deadline)}
                    </div>
                  )}
                </div>
              </div>
              {f.answered ? (
                <div className="rounded-[11px] bg-good-50 py-3 text-center text-[13.5px] font-bold text-good-700">✓ Inviato</div>
              ) : (
                <Button onClick={() => navigate(`/moduli/${f.id}`)}>Compila →</Button>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
