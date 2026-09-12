import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import * as formsService from '../../services/formsService'
import { Card } from '../../components/Card'
import { Button } from '../../components/Button'
import { EmptyState, Spinner } from '../../components/Feedback'
import { formatFullDate } from '../../lib/format'
import type { FormDef } from '../../types'

const TARGET_LABEL: Record<FormDef['targetType'], (f: FormDef) => string> = {
  all: () => 'Tutti gli animatori',
  oratory: (f) => f.targetOratories.map((o) => (o === 'jerago' ? 'Jerago' : 'Besnate')).join(', '),
  specific: (f) => `${f.targetUserIds.length} animatori selezionati`,
}

export function AdminModuliPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [forms, setForms] = useState<FormDef[] | null>(null)

  useEffect(() => {
    if (!user) return
    formsService.listFormsForAdmin(user).then((rows) => setForms([...rows].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())))
  }, [user])

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4 px-5 py-5 lg:px-8 lg:py-7">
      <div className="flex items-center justify-between">
        <div className="text-[20px] font-extrabold text-ink-950">Moduli</div>
        <Button className="!px-4 !py-2.5 !text-[13px]" icon={<Plus size={15} />} onClick={() => navigate('/admin/moduli/nuovo')}>Nuovo</Button>
      </div>

      {!forms ? (
        <Spinner />
      ) : forms.length === 0 ? (
        <EmptyState title="Nessun modulo creato" subtitle="Crea il primo modulo per raccogliere risposte dagli animatori." />
      ) : (
        <div className="flex flex-col gap-3">
          {forms.map((f) => (
            <Card key={f.id} className="animate-up flex cursor-pointer flex-col gap-2 transition-transform hover:-translate-y-0.5" onClick={() => navigate(`/admin/moduli/${f.id}/risultati`)}>
              <div className="flex items-start justify-between gap-2">
                <div className="text-[15px] font-bold text-ink-950">{f.title}</div>
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${f.status === 'open' ? 'bg-good-50 text-good-700' : 'bg-slate-100 text-slate-500'}`}>
                  {f.status === 'open' ? 'Aperto' : 'Chiuso'}
                </span>
              </div>
              <div className="text-xs text-slate-500">{TARGET_LABEL[f.targetType](f)}{f.deadline ? ` · Scade ${formatFullDate(f.deadline)}` : ''}</div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
