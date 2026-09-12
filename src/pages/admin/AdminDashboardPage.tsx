import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import * as dashboardService from '../../services/dashboardService'
import type { GeneralOverview } from '../../services/dashboardService'
import { Card } from '../../components/Card'
import { Button } from '../../components/Button'
import { Spinner } from '../../components/Feedback'
import { OratoryDashboardView } from './OratoryDashboardView'

const TILE: Record<string, { bg: string; ink: string }> = {
  jerago: { bg: 'bg-gradient-to-br from-bad-50 to-bad-100', ink: 'text-bad-600' },
  besnate: { bg: 'bg-gradient-to-br from-good-100 to-good-100', ink: 'text-good-700' },
}

export function AdminDashboardPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [overview, setOverview] = useState<GeneralOverview | null>(null)

  const isGeneral = user?.role === 'admin_general'

  useEffect(() => {
    if (!user || !isGeneral) return
    dashboardService.getGeneralOverview(user).then(setOverview)
  }, [user, isGeneral])

  if (!user) return null

  if (!isGeneral) {
    return <OratoryDashboardView oratoryId={user.oratoryId!} />
  }

  if (!overview) return <Spinner />

  return (
    <div className="flex flex-col gap-6 px-5 py-5 lg:px-8 lg:py-7">
      <div className="grid grid-cols-2 gap-4">
        <Card className="animate-up bg-good-50 !border-good-100">
          <div className="text-[38px] font-extrabold text-good-900">{overview.presentNow}</div>
          <div className="text-[13px] font-semibold text-good-700">Presenti ora</div>
        </Card>
        <Card className="animate-up">
          <div className="text-[38px] font-extrabold text-ink-950">{overview.totalAnimatori}</div>
          <div className="text-[13px] font-semibold text-slate-500">Animatori totali</div>
        </Card>
      </div>

      <div>
        <div className="mb-3 text-[15px] font-extrabold text-ink-950">Sedi</div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {overview.perOratory.map((o) => {
            const tile = TILE[o.oratoryId]
            return (
              <Card key={o.oratoryId} className="flex items-center gap-3.5 transition-transform hover:-translate-y-1">
                <span className={`flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-2xl ${tile.bg} ${tile.ink}`}>
                  <Building size={26} />
                </span>
                <span className="flex-1">
                  <span className="block text-base font-extrabold text-ink-950">{o.name}</span>
                  <span className="mt-0.5 block text-[12.5px] text-slate-500">{o.present} presenti · {o.total} animatori</span>
                </span>
                <Button variant="secondary" className="!px-4 !py-2.5 !text-[13px]" onClick={() => navigate(`/admin/sedi/${o.oratoryId}`)}>Apri</Button>
              </Card>
            )
          })}
        </div>
      </div>
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
